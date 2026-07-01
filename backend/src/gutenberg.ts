/**
 * gutenberg.ts — Shared module for downloading and processing Project Gutenberg books
 *
 * Used by both the CLI import tool and the web API import endpoint.
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

/** Download a URL and follow redirects (up to 5). Returns the response body as a string. */
export function download(url: string, redirects = 5): Promise<string> {
  const client = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    if (redirects <= 0) return reject(new Error('Too many redirects'));

    client.get(url, (res) => {
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
export function extractMetadata(rawText: string): { title: string; author: string } {
  let title = 'Unknown Title';
  let author = 'Unknown Author';

  // Look in the header (before the START marker)
  const startMarker = rawText.indexOf('*** START OF');
  const header = startMarker > 0 ? rawText.substring(0, startMarker) : rawText.substring(0, 2000);

  const titleMatch = header.match(/^Title:\s*(.+)$/m);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  const authorMatch = header.match(/^Author:\s*(.+)$/m);
  if (authorMatch) {
    author = authorMatch[1].trim();
  }

  return { title, author };
}

/** Strip Gutenberg header/footer boilerplate, returning only the book content. */
export function stripBoilerplate(rawText: string): string {
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
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

/** Wrap cleaned content in Markdown with YAML frontmatter. */
export function toMarkdown(title: string, author: string, gutenbergId: string, content: string): string {
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

export interface ImportResult {
  success: boolean;
  filename: string;
  title: string;
  author: string;
  sizeKB: number;
}

/**
 * Download a Gutenberg book by ID, process it, and save to the target directory.
 * Returns metadata about the saved book.
 */
export async function importGutenbergBook(
  gutenbergId: string,
  booksDir: string
): Promise<ImportResult> {
  const url = `https://www.gutenberg.org/cache/epub/${gutenbergId}/pg${gutenbergId}.txt`;

  const rawText = await download(url);

  const { title, author } = extractMetadata(rawText);
  const content = stripBoilerplate(rawText);

  if (content.length < 100) {
    throw new Error(`Content too short after stripping boilerplate (${content.length} chars)`);
  }

  const markdown = toMarkdown(title, author, gutenbergId, content);

  // Ensure output directory exists
  if (!fs.existsSync(booksDir)) {
    fs.mkdirSync(booksDir, { recursive: true });
  }

  const filename = `${slugify(title)}.md`;
  const outputPath = path.join(booksDir, filename);

  fs.writeFileSync(outputPath, markdown, 'utf-8');

  const sizeKB = Math.round(fs.statSync(outputPath).size / 1024);

  return { success: true, filename, title, author, sizeKB };
}
