# Developer Log

## 2026-06-27

### Initial Setup & Discussion
- Created the initial response in [CONVERSATION.md](file:///home/rallen/Documents/Devel/Node/bookie/CONVERSATION.md) under `## 1 Gemini` proposing:
  - **Backend**: Node.js + Express + TypeScript to scan directory and serve Markdown/Text files.
  - **Frontend**: Vite + TypeScript + Vanilla CSS using CSS Multi-column layout for horizontal book pagination.
- Initialized this [DEVLOG.md](file:///home/rallen/Documents/Devel/Node/bookie/DEVLOG.md) to keep track of development actions.
- Updated [CONVERSATION.md](file:///home/rallen/Documents/Devel/Node/bookie/CONVERSATION.md) with details about Git integration (initializing a Git repo and configuring `.gitignore`).

### Monorepo and Environment Setup
- Initialized Git repository and created root [.gitignore](file:///home/rallen/Documents/Devel/Node/bookie/.gitignore).
- Configured a monorepo setup at the root [package.json](file:///home/rallen/Documents/Devel/Node/bookie/package.json) using npm workspaces (`frontend` and `backend`), with a unified `npm run build` and `npm run dev` setup using `concurrently`.
- Installed dependencies including Express, CORS, TypeScript, `tsx`, Vite, and `marked` (markdown parser).

### Backend Implementation
- Created the Express backend server under [backend/src/index.ts](file:///home/rallen/Documents/Devel/Node/bookie/backend/src/index.ts).
- Implemented target directory resolution for scanning book files (supports command line argument, `BOOKS_DIR` env variable, or default root `/books` folder).
- Implemented basic YAML frontmatter parsing to extract titles and authors from Markdown files.
- Implemented API endpoints:
  - `GET /api/books`: Lists all available Markdown and Text books with metadata.
  - `GET /api/books/:filename`: Serves book contents with YAML frontmatter removed.
- Enabled production static file serving so that running the compiled backend also serves the frontend build files from the client `dist` directory.

### Frontend Implementation
- Configured Vite and Tailwind-free Vanilla CSS build settings under `/frontend`.
- Built the UI shell in [frontend/index.html](file:///home/rallen/Documents/Devel/Node/bookie/frontend/index.html) including:
  - Glassmorphic Library View with search filtering and dynamic bookshelf cards.
  - Header showing book metadata, a back button, and settings trigger.
  - Floating Settings panel with reading themes (Paper, Sepia, Charcoal, Night), font sizing (12px to 32px), and layout modes (Auto, 1 Column, 2 Columns).
  - Reader area featuring left/right navigation arrows, dynamic horizontal pagination layout, and bottom progress bar/page numbers indicators.
- Created styling in [frontend/src/style.css](file:///home/rallen/Documents/Devel/Node/bookie/frontend/src/style.css):
  - Theme colors mapped via CSS custom variables (`:root`, `[data-theme="..."]`).
  - Font rendering optimization utilizing Google Fonts (Inter for UI, Literata for book text, Instrument Serif for headers).
  - Dynamic page-splitting using CSS columns.
- Coded client logic in [frontend/src/main.ts](file:///home/rallen/Documents/Devel/Node/bookie/frontend/src/main.ts):
  - Integrated `marked` to render parsed Markdown content.
  - Formulated a pagination engine that dynamically injects `.snap-target` layout guides into the scroll container based on `scrollWidth` / `clientWidth` to ensure robust snapping.
  - Calculated page metrics: updates progress percentages and outputs readable strings (e.g. "Pages 3-4 of 12").
  - Programmed custom mouse drag-to-scroll page swiping.

### Content Creation
- Set up local [/books](file:///home/rallen/Documents/Devel/Node/bookie/books/) directory with test files:
  - [alice.md](file:///home/rallen/Documents/Devel/Node/bookie/books/alice.md) (Full text of Alice's Adventures in Wonderland extracted from Project Gutenberg eBook #11)
  - [sherlock.md](file:///home/rallen/Documents/Devel/Node/bookie/books/sherlock.md) (Full text of A Scandal in Bohemia extracted from Project Gutenberg eBook #1661)
  - [formatting-test.md](file:///home/rallen/Documents/Devel/Node/bookie/books/formatting-test.md) (formatting elements to check css styling)

### Git Version Control
- Staged all initialized project files, monorepo structures, Express APIs, Vite clients, and full-length Gutenberg text assets.
- Made the initial repository commit: `feat: init bookie project with Express backend, Vite TypeScript frontend, and Gutenberg books`.

### Project Documentation & Cleanup
- Stopped the concurrent backend and frontend development servers.
- Created a comprehensive [README.md](file:///home/rallen/Documents/Devel/Node/bookie/README.md) detailing project features, Node.js setup guides for beginners, monorepo run commands, and instructions for configuring library target directories.
- Staged and committed the documentation files.

### Private Books Separation
- Updated root [.gitignore](file:///home/rallen/Documents/Devel/Node/bookie/.gitignore) to ignore `books/local/` so personal/copyrighted books are never staged or checked in.
- Modified [backend/src/index.ts](file:///home/rallen/Documents/Devel/Node/bookie/backend/src/index.ts) to recursively scan subdirectories of the library path.
- Updated `getBookMetadata` fallback title generator to use the base filename instead of the full relative path.
- Extended `GET /api/books/:filename` using Express wildcard parameters (`:filename(*)`) to support requesting nested files.
- Programmed path traversal protection checks in the content router using absolute path resolution and prefix validation.
- Updated [README.md](file:///home/rallen/Documents/Devel/Node/bookie/README.md) to document the usage of the git-ignored `books/local/` folder.
- Staged and committed the code and documentation changes.

### GitHub Integration
- Configured and linked the local repository to a new public GitHub repository: [rogerallen/bookie](https://github.com/rogerallen/bookie).
- Pushed all initial commits and branch history to GitHub.
- Updated [README.md](file:///home/rallen/Documents/Devel/Node/bookie/README.md) to document and link to [CONVERSATION.md](file:///home/rallen/Documents/Devel/Node/bookie/CONVERSATION.md) and [DEVLOG.md](file:///home/rallen/Documents/Devel/Node/bookie/DEVLOG.md).

### Project Licensing
- Evaluated US Copyright law regarding AI-human collaborative works.
- Adopted the permissive MIT License for open-source distribution.
- Created [LICENSE](file:///home/rallen/Documents/Devel/Node/bookie/LICENSE) file in the root directory.
- Updated [README.md](file:///home/rallen/Documents/Devel/Node/bookie/README.md) to link to the new license.
- Staged, committed, and pushed the licensed files to GitHub.

### Bug Fixes
- Added `start:backend` and `start` scripts to the root [package.json](file:///home/rallen/Documents/Devel/Node/bookie/package.json) to resolve the `Missing script: "start:backend"` error when attempting to run in production.
- Verified successful launch of the production Express server on port 3001.

### Hostname Support (Network Access)
- Changed [frontend/src/main.ts](file:///home/rallen/Documents/Devel/Node/bookie/frontend/src/main.ts) to dynamically resolve `API_BASE` using `window.location.hostname` instead of hardcoding `localhost`. This allows network-wide access (using the host machine's IP or hostname).
- Updated [backend/src/index.ts](file:///home/rallen/Documents/Devel/Node/bookie/backend/src/index.ts) to resolve and print the local network hostname using Node's `os` module on server startup.











