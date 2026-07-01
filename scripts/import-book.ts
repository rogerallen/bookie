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

import path from 'path';
import { fileURLToPath } from 'url';
import { importGutenbergBook } from '../backend/src/gutenberg.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOKS_DIR = path.resolve(__dirname, '../books/gutenberg');

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

  console.log(`📥 Downloading Gutenberg #${gutenbergId}...`);

  try {
    const result = await importGutenbergBook(gutenbergId, BOOKS_DIR);
    console.log(`📚 Found: "${result.title}" by ${result.author}`);
    console.log(`✅ Saved → books/gutenberg/${result.filename} (${result.sizeKB} KB)`);
  } catch (err: any) {
    console.error(`❌ Failed: ${err.message}`);
    console.error(`   Check that ID ${gutenbergId} exists at https://www.gutenberg.org/ebooks/${gutenbergId}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
