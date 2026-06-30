#!/usr/bin/env tsx
/**
 * import-book.ts — Download a public domain book from Project Gutenberg by ID
 *
 * Usage:
 *   npm run import -- <gutenberg-id>
 *   npm run import -- 1342          # Pride and Prejudice
 *   npm run import -- 84            # Frankenstein
 *
 * The script downloads the plain text, extracts title/author metadata,
 * strips Gutenberg's license boilerplate, wraps it in Markdown with YAML
 * frontmatter, and saves it to books/gutenberg/.
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOKS_DIR = path.resolve(__dirname, '../books/gutenberg');

// --- Helpers ---

/** Download a URL and follow redirects (up to 5). Returns the response body as a string. */
function download(url: string, redirects = 5): Promise<string> {
  return new Promise((resolve, reject) => {
    if (redirects <= 0) return reject(new Error('Too many redirects'));

    https.get(url, (res) => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(download(res.headers.location, redirects - 1));
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }

      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/** Extract title and author from Gutenberg's plain text header. */
function extractMetadata(rawText: string): { title: string; author: string } {
  let title = 'Unknown Title';
  let author = 'Unknown Author';

  // Look in the header (before the START marker)
  const startMarker = rawText.indexOf('*** START OF');
  const header = startMarker > 0 ? rawText.substring(0, startMarker) : rawText.substring(0, 2000);

  // Title: line
  const titleMatch = header.match(/^Title:\s*(.+)$/m);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  // Author: line
  const authorMatch = header.match(/^Author:\s*(.+)$/m);
  if (authorMatch) {
    author = authorMatch[1].trim();
  }

  return { title, author };
}

/** Strip Gutenberg header/footer boilerplate, returning only the book content. */
function stripBoilerplate(rawText: string): string {
  let content = rawText;

  // Find START marker
  const startMatch = content.match(/\*{3}\s*START OF THE PROJECT GUTENBERG EBOOK[^\n]*\*{3}/i);
  if (startMatch && startMatch.index !== undefined) {
    content = content.substring(startMatch.index + startMatch[0].length);
  }

  // Find END marker
  const endMatch = content.match(/\*{3}\s*END OF THE PROJECT GUTENBERG EBOOK[^\n]*\*{3}/i);
  if (endMatch && endMatch.index !== undefined) {
    content = content.substring(0, endMatch.index);
  }

  // Clean up: normalize line endings, trim leading/trailing whitespace
  content = content.replace(/\r\n/g, '\n').trim();

  return content;
}

/** Convert a title string to a safe filename slug. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, '')           // Remove apostrophes
    .replace(/[^a-z0-9]+/g, '-')    // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '')        // Trim leading/trailing hyphens
    .substring(0, 80);              // Limit length
}

/** Wrap cleaned content in Markdown with YAML frontmatter. */
function toMarkdown(title: string, author: string, gutenbergId: string, content: string): string {
  return `---
title: ${title}
author: ${author}
source: gutenberg
gutenberg_id: ${gutenbergId}
---

# ${title}

*by ${author}*

${content}
`;
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
📖 Bookie — Gutenberg Book Importer

Usage:
  npm run import -- <gutenberg-id>

Examples:
  npm run import -- 1342      # Pride and Prejudice
  npm run import -- 84        # Frankenstein
  npm run import -- 11        # Alice's Adventures in Wonderland
  npm run import -- 1661      # The Adventures of Sherlock Holmes

Browse https://www.gutenberg.org to find book IDs.
The ID is the number in the URL, e.g. gutenberg.org/ebooks/1342 → ID 1342
`);
    process.exit(0);
  }

  const gutenbergId = args[0];

  // Validate ID is numeric
  if (!/^\d+$/.test(gutenbergId)) {
    console.error(`❌ Error: "${gutenbergId}" is not a valid Gutenberg ID (must be a number).`);
    process.exit(1);
  }

  const url = `https://www.gutenberg.org/cache/epub/${gutenbergId}/pg${gutenbergId}.txt`;

  console.log(`📥 Downloading Gutenberg #${gutenbergId} from ${url}...`);

  let rawText: string;
  try {
    rawText = await download(url);
  } catch (err: any) {
    console.error(`❌ Failed to download: ${err.message}`);
    console.error(`   Check that ID ${gutenbergId} exists at https://www.gutenberg.org/ebooks/${gutenbergId}`);
    process.exit(1);
  }

  // Extract metadata
  const { title, author } = extractMetadata(rawText);
  console.log(`📚 Found: "${title}" by ${author}`);

  // Strip boilerplate
  const content = stripBoilerplate(rawText);

  if (content.length < 100) {
    console.error(`❌ Error: Content seems too short after stripping boilerplate (${content.length} chars). Something may be wrong.`);
    process.exit(1);
  }

  // Convert to markdown
  const markdown = toMarkdown(title, author, gutenbergId, content);

  // Ensure output directory exists
  if (!fs.existsSync(BOOKS_DIR)) {
    fs.mkdirSync(BOOKS_DIR, { recursive: true });
  }

  // Write file
  const filename = `${slugify(title)}.md`;
  const outputPath = path.join(BOOKS_DIR, filename);

  if (fs.existsSync(outputPath)) {
    console.log(`⚠️  File already exists: ${outputPath}`);
    console.log(`   Overwriting...`);
  }

  fs.writeFileSync(outputPath, markdown, 'utf-8');

  const sizeKB = Math.round(fs.statSync(outputPath).size / 1024);
  console.log(`✅ Saved "${title}" by ${author} → books/gutenberg/${filename} (${sizeKB} KB)`);
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
