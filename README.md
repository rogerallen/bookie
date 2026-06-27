# bookie — Horizontal Book Reader

**bookie** is a modern, responsive Single Page Web Application (SPA) designed to read text and Markdown files like a physical book. It flows text horizontally across pages instead of vertical scrolling, automatically scaling the page layout dynamically to the height and width of your screen.

This project is built collaboratively by Roger and Gemini. The design process and development logs are documented in:
- [CONVERSATION.md](CONVERSATION.md): The call-and-response design discussion, technology choices, and architectural planning.
- [DEVLOG.md](DEVLOG.md): The chronological developer log tracking all file additions, project structure configurations, and git milestones.

---

## Features

- **Book-Inspired Horizontal Flow**: Page splits are automatically calculated using native CSS Multi-column layout.
- **Scroll Snapping & Mouse Gestures**: Pages snap perfectly into place, allowing you to click navigation arrows, use arrow keys/spacebar, or drag horizontally with a mouse or touch swipe.
- **Responsive Sizing**: Automatically supports 1-column layouts (perfect for mobile) or 2-column layouts (double-page spreads for desktop).
- **Themes & Aesthetics**: Reading modes configured for different environments (Paper, Sepia, Charcoal, and Night).
- **Custom Sizing**: Instantly increase or decrease font size with automatic re-pagination.
- **Metadata Support**: Reads YAML frontmatter to extract titles and authors.

---

## 1. Prerequisites (Installing Node.js)

To run **bookie**, you need Node.js installed on your machine.

### Windows & macOS
Download and run the installer from the [official Node.js website](https://nodejs.org/). Choose the **LTS (Long Term Support)** version.

### Linux (Ubuntu/Debian)
Open your terminal and run:
```bash
sudo apt update
sudo apt install nodejs npm
```

### Verification
Once installed, verify that Node.js and npm are available by checking their versions in your terminal:
```bash
node -v
npm -v
```
*(Node.js v18+ is recommended)*

---

## 2. Project Installation

1. Clone or copy the project files to your local folder.
2. Open a terminal in the project root directory (`bookie/`).
3. Install all dependencies for both frontend and backend using the root npm workspace command:
   ```bash
   npm install
   ```

---

## 3. Adding Your Books

By default, **bookie** scans a folder called `books/` in the project root recursively.

1. Create a `books/` folder in the project root if it does not exist.
2. Copy your Markdown (`.md`) or text (`.txt`) files into it.
3. **Personal/Copyrighted Books**: To prevent committing personal or copyrighted texts into Git, place them inside a subfolder named `books/local/` (e.g., `books/local/my-novel.md`). The root `.gitignore` is configured to ignore the entire `books/local/` directory, while the backend recursively scans it so the books still appear in your browser.
4. (Optional) Prepend a YAML frontmatter block to the top of your files to configure the title and author. If omitted, the app will use the filename as the title.

### Book Frontmatter Example (`books/my-book.md`)
```markdown
---
title: My First Masterpiece
author: Jane Doe
---

# Chapter 1

This is the content of my book. It will be split into horizontal pages automatically when viewed in bookie.
```

---

## 4. Running the Application

There are two ways to run **bookie** depending on your environment:

### A. Development Mode
To run both the frontend Vite server and backend Express API server simultaneously with hot reloading (auto-rebuilding on code changes):
```bash
npm run dev
```
- **Frontend App**: Open [http://localhost:5173/](http://localhost:5173/) in your web browser.
- **Backend API**: Runs on [http://localhost:3001/](http://localhost:3001/).

### B. Production Mode (Single Port)
To compile the frontend and run a unified production server on a single port:
1. Build both projects:
   ```bash
   npm run build
   ```
2. Start the unified production server:
   ```bash
   npm run start:backend
   ```
   *Note: In the backend `package.json`, you can run the compiled JS files. To start the backend, run `npm run start -w backend`.*
3. Open [http://localhost:3001/](http://localhost:3001/) in your web browser. (The backend will serve the static built frontend files directly).

---

## 5. Advanced Configuration (Custom Library Directories)

If you don't want to use the default `books/` directory inside the project root, you can point **bookie** to any directory on your computer containing text files:

### Method A: CLI Arguments
Run the backend and pass the path as a trailing argument:
```bash
# In development
npm run dev:backend -- /absolute/path/to/my/library

# In production
npm run start -w backend -- /absolute/path/to/my/library
```

### Method B: Environment Variables
Set the `BOOKS_DIR` environment variable before running:
```bash
# Linux / macOS
BOOKS_DIR="/absolute/path/to/my/library" npm run dev

# Windows (Command Prompt)
set BOOKS_DIR="C:\path\to\my\library" && npm run dev

# Windows (PowerShell)
$env:BOOKS_DIR="C:\path\to\my\library"; npm run dev
```
