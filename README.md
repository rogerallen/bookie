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
- **Offline Reading & PWA**: Install the app on your home screen or desktop. Cache books locally with one click to read them fully offline.

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

## 4. Importing Public Domain Books

**bookie** includes a built-in import tool that downloads free public domain books from [Project Gutenberg](https://www.gutenberg.org) — a library of over 70,000 titles.

### How It Works

1. **Browse** [gutenberg.org](https://www.gutenberg.org) and find a book you'd like to read.
2. **Note the ID number** from the book's URL (e.g. `gutenberg.org/ebooks/1342` → the ID is `1342`).
3. **Run the import command**:
   ```bash
   npm run import -- 1342
   ```
4. The tool will download the text, strip Project Gutenberg's license boilerplate, extract the title and author, and save a clean Markdown file to `books/gutenberg/`.
5. **Start or refresh bookie** — the book appears on your bookshelf!

### Examples

```bash
npm run import -- 1342    # Pride and Prejudice — Jane Austen
npm run import -- 84      # Frankenstein — Mary Shelley
npm run import -- 1661    # Adventures of Sherlock Holmes — Arthur Conan Doyle
npm run import -- 345     # Dracula — Bram Stoker
npm run import -- 1232    # The Prince — Niccolò Machiavelli
npm run import -- 2701    # Moby Dick — Herman Melville
npm run import -- 98      # A Tale of Two Cities — Charles Dickens
npm run import -- 174     # The Picture of Dorian Gray — Oscar Wilde
npm run import -- 76      # Adventures of Huckleberry Finn — Mark Twain
npm run import -- 1952    # The Yellow Wallpaper — Charlotte Perkins Gilman
```

### Help

Run with `--help` to see usage info:
```bash
npm run import -- --help
```

> **Note:** Downloaded books are saved to `books/gutenberg/` which is gitignored — they stay local to your machine and are not committed to the repository.

---

## 5. Running the Application

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

## 6. Advanced Configuration (Custom Library Directories)

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

---

## 7. Offline Reading & PWA Installation

**bookie** is a Progressive Web App (PWA), which means it can be installed on your mobile phone or desktop computer and run fully offline without any server connection.

### Installing the App
- **On Mobile (iOS Safari)**: Open the app URL, tap the **Share** button, and select **Add to Home Screen**.
- **On Mobile (Android Chrome)**: Open the app URL, tap the menu icon, and select **Install App** or **Add to Home Screen**.
- **On Desktop (Chrome/Edge)**: Click the **Install** icon in the right side of the address bar.

Once installed, **bookie** launches in a standalone, distraction-free app window with its own vector icon (📖).

### Downloading Books for Offline Reading
- While online and connected to the server, you will see an **Install/Download icon (📥)** in the bottom-right corner of each book card.
- Click the icon to download the book content into the browser's Cache Storage. The card will update to show a **✓ Offline (💾)** badge.
- If the server stops or you lose connection, **bookie** will show an amber **Working Offline** banner at the top, list only your downloaded books on the bookshelf, and let you read them in full!
- Click the **💾** badge on any book to remove it from offline storage and free up space.

### Important: Mobile Offline & HTTPS Requirements
Modern web browsers enforce strict security rules: **Service Workers** (which allow apps to load their layouts/code when the server is shut down) will **only register in Secure Contexts (HTTPS or localhost)**.

If you access the app on your mobile phone via an insecure HTTP network address (like `http://192.168.1.50:3001` or `http://my-hostname:3001`):
- The app will let you download books and read them *as long as you keep the browser tab open* (utilizing our transparent `localStorage` fallback).
- However, if you close the tab or attempt to launch the installed home-screen icon while the server is stopped, it will show "This site can't be reached" because the browser blocks the Service Worker from caching the HTML/JS/CSS files over insecure HTTP.

To enable full, off-grid standalone loading on your phone:
1. **Option A: Secure Tunnel (Recommended)**: Use a tool like [ngrok](https://ngrok.com/) to expose your local port securely:
   ```bash
   ngrok http 3001
   ```
   Open the secure `https://xxxx.ngrok-free.app` URL on your phone. Because it uses HTTPS, the Service Worker will register successfully, allow PWA home-screen installation, and let you load the reader completely offline.
2. **Option B: Chrome USB Port Forwarding**: 
   - Connect your Android phone to your computer via USB.
   - Open Chrome on your desktop and navigate to `chrome://inspect/#devices`.
   - Click **Port forwarding...** and map port `3001` to `localhost:3001`.
   - Open `http://localhost:3001` on your phone. Because Chrome treats `localhost` as a secure context, the Service Worker will register and cache the shell assets for offline use.
3. **Option C: Tailscale HTTPS & Serve (Best for Tailscale users)**: If both your phone and computer are on your Tailscale VPN (Tailnet), you can use Tailscale's native secure reverse proxy.
   - Ensure **HTTPS Certificates** are enabled in your [Tailscale Admin Console](https://login.tailscale.com/admin/settings/keys).
   - In a terminal on your computer, run:
     ```bash
     tailscale serve --bg http://localhost:3001
     ```
     *(This starts serve in the background, proxying HTTPS on your tailnet address to your local port 3001).*
   - Open your phone and go to `https://your-machine-name.your-tailnet-domain.ts.net`.
   - Because Tailscale automatically provisions a valid, trusted Let's Encrypt SSL certificate for your tailnet domain, it is a secure context. The Service Worker will register and cache all shell assets, allowing full offline home-screen launches!

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

