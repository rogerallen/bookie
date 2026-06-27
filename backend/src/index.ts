import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Resolve the directory containing books
// We check command line args, environment variable, or default to a local 'books' folder
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let booksDir = '';
if (process.argv[2]) {
  booksDir = path.resolve(process.argv[2]);
} else if (process.env.BOOKS_DIR) {
  booksDir = path.resolve(process.env.BOOKS_DIR);
} else {
  // Default to the 'books' directory in the project root
  booksDir = path.resolve(__dirname, '../../books');
}

console.log(`[Bookie Backend] Target books directory: ${booksDir}`);

// Ensure directory exists or warn
if (!fs.existsSync(booksDir)) {
  console.warn(`[Bookie Backend] Warning: directory ${booksDir} does not exist. Creating it.`);
  fs.mkdirSync(booksDir, { recursive: true });
}

// Simple Helper to parse Markdown Frontmatter
interface BookMetadata {
  filename: string;
  title: string;
  author: string;
}

function getBookMetadata(filename: string, filePath: string): BookMetadata {
  const defaultMeta: BookMetadata = {
    filename,
    title: filename.replace(/\.(md|txt)$/i, '').replace(/[-_]/g, ' '),
    author: 'Unknown'
  };

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Frontmatter regex
    const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
    if (match) {
      const yamlLines = match[1].split('\n');
      yamlLines.forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim().toLowerCase();
          const val = parts.slice(1).join(':').trim();
          if (key === 'title') {
            defaultMeta.title = val;
          } else if (key === 'author') {
            defaultMeta.author = val;
          }
        }
      });
    }
  } catch (err) {
    console.error(`Error reading metadata for ${filename}:`, err);
  }

  return defaultMeta;
}

// GET /api/books - lists all books in the target folder
app.get('/api/books', (req, res) => {
  try {
    if (!fs.existsSync(booksDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(booksDir);
    const bookFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ext === '.md' || ext === '.txt';
    });

    const books = bookFiles.map(filename => {
      const filePath = path.join(booksDir, filename);
      return getBookMetadata(filename, filePath);
    });

    res.json(books);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to read books directory', details: err.message });
  }
});

// GET /api/books/:filename - serves the raw content of the book
app.get('/api/books/:filename', (req, res) => {
  const { filename } = req.params;
  
  // Prevent directory traversal
  const safeFilename = path.basename(filename);
  const filePath = path.join(booksDir, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Book file not found' });
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    // We'll also return metadata alongside the content
    const metadata = getBookMetadata(safeFilename, filePath);

    // Strip frontmatter from content to make parsing on client easier
    let cleanContent = content;
    const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n/);
    if (match) {
      cleanContent = content.substring(match[0].length);
    }

    res.json({
      metadata,
      content: cleanContent
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to read book file', details: err.message });
  }
});

// Serve production frontend assets if built
const distPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(distPath)) {
  console.log(`[Bookie Backend] Serving static frontend files from: ${distPath}`);
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    // API routes fall through
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`[Bookie Backend] Server running on http://localhost:${PORT}`);
});
