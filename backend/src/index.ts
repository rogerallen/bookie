import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

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
  const baseName = path.basename(filename);
  const defaultMeta: BookMetadata = {
    filename,
    title: baseName.replace(/\.(md|txt)$/i, '').replace(/[-_]/g, ' '),
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

// Recursive helper to list all markdown/text files in directory
function scanBooksDir(dir: string, baseDir: string = booksDir): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(scanBooksDir(filePath, baseDir));
    } else {
      const ext = path.extname(file).toLowerCase();
      if (ext === '.md' || ext === '.txt') {
        const relativePath = path.relative(baseDir, filePath).replace(/\\/g, '/');
        results.push(relativePath);
      }
    }
  }
  return results;
}

// GET /api/books - lists all books in the target folder recursively
app.get('/api/books', (req, res) => {
  try {
    if (!fs.existsSync(booksDir)) {
      return res.json([]);
    }

    const bookFiles = scanBooksDir(booksDir);

    const books = bookFiles.map(filename => {
      const filePath = path.join(booksDir, filename);
      return getBookMetadata(filename, filePath);
    });

    res.json(books);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to read books directory', details: err.message });
  }
});

// GET /api/books/:filename(*) - serves the raw content of the book
app.get('/api/books/:filename(*)', (req, res) => {
  const requestedFile = req.params.filename;
  
  // Prevent directory traversal
  const filePath = path.resolve(booksDir, requestedFile);

  if (!filePath.startsWith(booksDir)) {
    return res.status(403).json({ error: 'Access denied: Path traversal detected' });
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return res.status(404).json({ error: 'Book file not found' });
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const metadata = getBookMetadata(requestedFile, filePath);

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
  const hostname = os.hostname();
  console.log(`[Bookie Backend] Server running on:`);
  console.log(`  - Local:   http://localhost:${PORT}`);
  console.log(`  - Network: http://${hostname}:${PORT}`);
});
