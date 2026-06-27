import './style.css';
import { marked } from 'marked';

// --- Types & Interfaces ---
interface BookMetadata {
  filename: string;
  title: string;
  author: string;
}

interface BookDetails {
  metadata: BookMetadata;
  content: string;
}

// --- App State ---
const state = {
  books: [] as BookMetadata[],
  activeBook: null as BookDetails | null,
  currentView: 'library' as 'library' | 'reader',
  theme: 'paper' as 'paper' | 'sepia' | 'charcoal' | 'night',
  fontSize: 18, // in px
  layoutColumns: 'auto' as 'auto' | '1' | '2',
  currentPageSpread: 0,
  totalPagesSpreads: 1,
  downloadedBooks: new Set<string>(), // Tracks offline-stored book filenames
};

// --- DOM Cache ---
const DOM = {
  loading: document.getElementById('loading') as HTMLDivElement,
  libraryView: document.getElementById('library-view') as HTMLDivElement,
  readerView: document.getElementById('reader-view') as HTMLDivElement,
  bookshelfGrid: document.getElementById('bookshelf-grid') as HTMLDivElement,
  bookCount: document.getElementById('book-count') as HTMLSpanElement,
  searchInput: document.getElementById('search-input') as HTMLInputElement,
  offlineBanner: document.getElementById('offline-banner') as HTMLDivElement,
  
  // Reader elements
  backButton: document.getElementById('back-button') as HTMLButtonElement,
  readerBookTitle: document.getElementById('reader-book-title') as HTMLHeadingElement,
  readerBookAuthor: document.getElementById('reader-book-author') as HTMLParagraphElement,
  settingsToggle: document.getElementById('settings-toggle') as HTMLButtonElement,
  settingsPanel: document.getElementById('settings-panel') as HTMLDivElement,
  
  // Reader view controls
  fontDecrease: document.getElementById('font-decrease') as HTMLButtonElement,
  fontIncrease: document.getElementById('font-increase') as HTMLButtonElement,
  fontSizeDisplay: document.getElementById('font-size-display') as HTMLSpanElement,
  
  // Navigation elements
  prevPageBtn: document.getElementById('prev-page-btn') as HTMLButtonElement,
  nextPageBtn: document.getElementById('next-page-btn') as HTMLButtonElement,
  readerContainer: document.getElementById('reader-container') as HTMLDivElement,
  readerViewport: document.getElementById('reader-viewport') as HTMLDivElement,
  readerContent: document.getElementById('reader-content') as HTMLElement,
  snapPoints: document.getElementById('snap-points') as HTMLDivElement,
  
  // Footer
  progressContainer: document.getElementById('progress-container') as HTMLDivElement,
  progressFill: document.getElementById('progress-fill') as HTMLDivElement,
  pageIndicator: document.getElementById('page-indicator') as HTMLSpanElement,
};

const API_BASE = window.location.port === '5173'
  ? `${window.location.protocol}//${window.location.hostname}:3001/api`
  : `${window.location.origin}/api`;

const BOOK_CACHE_NAME = 'bookie-books-v1';

// --- Fetch Timeout Helper ---
async function fetchWithTimeout(resource: RequestInfo | URL, options: RequestInit & { timeout?: number } = {}) {
  const { timeout = 3000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}


// --- Initialization ---
async function init() {
  registerServiceWorker();
  setupGlobalListeners();
  setupDragToScroll();
  loadSavedSettings();
  loadOfflineState();
  await fetchLibrary();
  hideLoading();
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('[PWA] Service Worker registered', reg))
        .catch(err => console.error('[PWA] Registration failed', err));
    });
  }
}

function loadOfflineState() {
  const savedMeta = localStorage.getItem('bookie-offline-metadata');
  if (savedMeta) {
    try {
      const list = JSON.parse(savedMeta) as BookMetadata[];
      list.forEach(b => state.downloadedBooks.add(b.filename));
    } catch (e) {
      console.error('[PWA] Failed to parse offline metadata list:', e);
    }
  }
}

// --- Fetch Library ---
async function fetchLibrary() {
  const isOffline = !navigator.onLine;
  updateOfflineUI(isOffline);

  try {
    showLoading();
    if (isOffline) {
      const savedMeta = localStorage.getItem('bookie-offline-metadata');
      state.books = savedMeta ? JSON.parse(savedMeta) : [];
      renderBookshelf(state.books);
      return;
    }

    const res = await fetchWithTimeout(`${API_BASE}/books`, { timeout: 3000 });
    if (!res.ok) throw new Error('Failed to fetch library index');
    state.books = await res.json();
    renderBookshelf(state.books);
  } catch (err) {
    console.error('Error fetching library, falling back to offline:', err);
    const savedMeta = localStorage.getItem('bookie-offline-metadata');
    state.books = savedMeta ? JSON.parse(savedMeta) : [];
    renderBookshelf(state.books);
    updateOfflineUI(true);
  } finally {
    hideLoading();
  }
}

function updateOfflineUI(isOffline: boolean) {
  if (isOffline) {
    DOM.offlineBanner.classList.remove('hidden');
  } else {
    DOM.offlineBanner.classList.add('hidden');
  }
}

// --- Render Library ---
function renderBookshelf(books: BookMetadata[]) {
  const isOffline = !navigator.onLine;
  DOM.bookCount.textContent = `${books.length} book${books.length === 1 ? '' : 's'} found`;
  
  if (books.length === 0) {
    DOM.bookshelfGrid.innerHTML = `
      <div class="empty-shelf-placeholder">
        <p>Your bookshelf is empty.</p>
        ${isOffline 
          ? '<p class="hint">No downloaded books available. Connect to the network to download books.</p>' 
          : '<p class="hint">Place Markdown (.md) or Text (.txt) files in the <code>books/</code> directory.</p>'}
      </div>
    `;
    return;
  }

  let html = '';
  if (isOffline) {
    html += `<div class="offline-shelf-indicator">📂 Showing downloaded books available for offline reading</div>`;
  }

  html += books.map(book => {
    const isDownloaded = state.downloadedBooks.has(book.filename);
    const downloadIcon = isDownloaded ? '💾' : '📥';
    const downloadClass = isDownloaded ? 'downloaded' : '';
    const downloadTitle = isDownloaded ? 'Stored Offline (Click to remove)' : 'Download for Offline';
    const badgeText = isDownloaded ? '<span class="offline-ready-badge">✓ Offline</span>' : '';

    return `
      <div class="book-card" data-filename="${encodeURIComponent(book.filename)}">
        <div class="book-card-meta">
          <h3 class="book-card-title">${escapeHtml(book.title)}</h3>
          <p class="book-card-author">by ${escapeHtml(book.author)}</p>
        </div>
        <div class="book-card-footer">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="book-card-badge">${escapeHtml(getFileExtension(book.filename).toUpperCase())}</span>
            ${badgeText}
          </div>
          <button class="btn-card-action ${downloadClass}" data-filename="${encodeURIComponent(book.filename)}" title="${downloadTitle}" aria-label="${downloadTitle}">
            ${downloadIcon}
          </button>
        </div>
      </div>
    `;
  }).join('');

  DOM.bookshelfGrid.innerHTML = html;

  // Attach card click listeners
  DOM.bookshelfGrid.querySelectorAll('.book-card').forEach(card => {
    card.addEventListener('click', async () => {
      const filename = card.getAttribute('data-filename');
      if (filename) {
        await openBook(decodeURIComponent(filename));
      }
    });
  });

  // Attach download button click listeners
  DOM.bookshelfGrid.querySelectorAll('.btn-card-action').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const filename = btn.getAttribute('data-filename');
      if (!filename) return;
      const decodedFilename = decodeURIComponent(filename);
      const book = books.find(b => b.filename === decodedFilename);
      if (!book) return;

      const isDownloaded = state.downloadedBooks.has(decodedFilename);
      if (isDownloaded) {
        if (confirm(`Remove "${book.title}" from offline storage?`)) {
          await deleteBook(decodedFilename);
        }
      } else {
        await downloadBook(book);
      }
    });
  });
}

// --- Offline Storage Wrappers (Cache API) ---
async function saveBookOffline(book: BookMetadata, data: BookDetails): Promise<void> {
  const cacheUrl = `${API_BASE}/books/${encodeURIComponent(book.filename)}`;
  const cache = await caches.open(BOOK_CACHE_NAME);
  const response = new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
  await cache.put(cacheUrl, response);
}

async function getStoredBookOffline(filename: string): Promise<BookDetails | null> {
  const cacheUrl = `${API_BASE}/books/${encodeURIComponent(filename)}`;
  try {
    const cache = await caches.open(BOOK_CACHE_NAME);
    const cachedResponse = await cache.match(cacheUrl);
    if (cachedResponse) {
      return await cachedResponse.json();
    }
  } catch (e) {
    console.warn('[PWA] Cache match failed:', e);
  }
  return null;
}

async function removeBookOffline(filename: string): Promise<void> {
  const cacheUrl = `${API_BASE}/books/${encodeURIComponent(filename)}`;
  const cache = await caches.open(BOOK_CACHE_NAME);
  await cache.delete(cacheUrl);
}

// --- Download & Delete Book Flows ---
async function downloadBook(book: BookMetadata) {
  try {
    showLoading();
    const cacheUrl = `${API_BASE}/books/${encodeURIComponent(book.filename)}`;
    
    // Fetch the book content from API
    const res = await fetchWithTimeout(cacheUrl, { timeout: 10000 });
    if (!res.ok) throw new Error('Failed to fetch book content from API');
    
    const data: BookDetails = await res.json();
    
    // Save to local storage (transparently handles Cache or localStorage)
    await saveBookOffline(book, data);
    
    // Update local state and localStorage
    state.downloadedBooks.add(book.filename);
    const savedMeta = localStorage.getItem('bookie-offline-metadata');
    let list: BookMetadata[] = [];
    if (savedMeta) {
      list = JSON.parse(savedMeta);
    }
    if (!list.some(b => b.filename === book.filename)) {
      list.push(book);
      localStorage.setItem('bookie-offline-metadata', JSON.stringify(list));
    }
    
    renderBookshelf(state.books);
  } catch (err: any) {
    console.error('[PWA] Failed to download book:', err);
    alert(err.message || `Could not download "${book.title}" for offline reading.`);
  } finally {
    hideLoading();
  }
}

async function deleteBook(filename: string) {
  try {
    showLoading();
    
    // Remove book from offline storage wrappers
    await removeBookOffline(filename);
    
    state.downloadedBooks.delete(filename);
    
    const savedMeta = localStorage.getItem('bookie-offline-metadata');
    if (savedMeta) {
      let list: BookMetadata[] = JSON.parse(savedMeta);
      list = list.filter(b => b.filename !== filename);
      localStorage.setItem('bookie-offline-metadata', JSON.stringify(list));
    }
    
    if (!navigator.onLine) {
      state.books = state.books.filter(b => b.filename !== filename);
    }
    
    renderBookshelf(state.books);
  } catch (err) {
    console.error('[PWA] Failed to delete book:', err);
  } finally {
    hideLoading();
  }
}

// --- Search / Filtering ---
DOM.searchInput.addEventListener('input', () => {
  const query = DOM.searchInput.value.toLowerCase().trim();
  const filtered = state.books.filter(book => 
    book.title.toLowerCase().includes(query) || 
    book.author.toLowerCase().includes(query) ||
    book.filename.toLowerCase().includes(query)
  );
  renderBookshelf(filtered);
});

// --- Open Book ---
async function openBook(filename: string) {
  try {
    showLoading();
    let data: BookDetails | null = null;

    // Try finding in offline storage first (transparent fallback)
    data = await getStoredBookOffline(filename);

    if (!data) {
      const cacheUrl = `${API_BASE}/books/${encodeURIComponent(filename)}`;
      const res = await fetchWithTimeout(cacheUrl, { timeout: 4000 });
      if (!res.ok) throw new Error(`Failed to load book: ${filename}`);
      data = await res.json();
    }
    
    if (!data) {
      throw new Error(`Failed to load book data: ${filename}`);
    }
    
    state.activeBook = data;
    
    // Inject metadata
    DOM.readerBookTitle.textContent = data.metadata.title;
    DOM.readerBookAuthor.textContent = `by ${data.metadata.author}`;
    
    // Parse Markdown content to HTML
    const htmlContent = await marked.parse(data.content);
    DOM.readerContent.innerHTML = htmlContent;
    
    // Reset view position
    DOM.readerViewport.scrollLeft = 0;
    state.currentPageSpread = 0;
    
    // Switch views
    switchView('reader');
    
    // Calculate page layout and sizes after transition
    setTimeout(() => {
      recalculatePages();
    }, 50);
  } catch (err) {
    console.error('Error opening book:', err);
    alert('Could not open the selected book.');
  } finally {
    hideLoading();
  }
}

// --- Layout & Pagination Engine ---
function recalculatePages() {
  if (!state.activeBook) return;

  const viewport = DOM.readerViewport;
  const content = DOM.readerContent;
  
  // Set layout class based on config and screen width
  const isWide = window.innerWidth > 768;
  const layoutCols = state.layoutColumns;
  
  content.classList.remove('one-column', 'two-columns');
  
  let actualCols = 1;
  if (layoutCols === '2' || (layoutCols === 'auto' && isWide)) {
    content.classList.add('two-columns');
    actualCols = 2;
  } else {
    content.classList.add('one-column');
    actualCols = 1;
  }
  
  // Get viewport page dimensions
  const pageWidth = viewport.clientWidth;
  if (pageWidth <= 0) return;
  
  // Measure total scroll width
  const totalScrollWidth = content.scrollWidth;
  const numSpreads = Math.max(1, Math.ceil(totalScrollWidth / pageWidth));
  
  state.totalPagesSpreads = numSpreads;
  
  // Re-generate snap targets to set viewport bounds and snapping
  DOM.snapPoints.innerHTML = '';
  // Set the snap points container width to match the pages
  DOM.snapPoints.style.width = `${numSpreads * 100}vw`;
  
  for (let i = 0; i < numSpreads; i++) {
    const snapTarget = document.createElement('div');
    snapTarget.className = 'snap-target';
    DOM.snapPoints.appendChild(snapTarget);
  }
  
  updatePaginationIndicator(actualCols);
}

function updatePaginationIndicator(actualCols: number) {
  const viewport = DOM.readerViewport;
  const pageWidth = viewport.clientWidth;
  if (pageWidth <= 0) return;

  const scrollLeft = viewport.scrollLeft;
  const currentSpread = Math.min(
    state.totalPagesSpreads - 1,
    Math.max(0, Math.round(scrollLeft / pageWidth))
  );
  
  state.currentPageSpread = currentSpread;
  
  // Update progress bar
  const progressPercent = state.totalPagesSpreads > 1 
    ? (currentSpread / (state.totalPagesSpreads - 1)) * 100 
    : 100;
  DOM.progressFill.style.width = `${progressPercent}%`;
  
  // Update Page numbers
  if (actualCols === 1) {
    DOM.pageIndicator.textContent = `Page ${currentSpread + 1} of ${state.totalPagesSpreads}`;
  } else {
    // 2 columns per spread
    const startPage = currentSpread * 2 + 1;
    const endPage = Math.min(state.totalPagesSpreads * 2, currentSpread * 2 + 2);
    
    if (startPage === endPage) {
      DOM.pageIndicator.textContent = `Page ${startPage} of ${state.totalPagesSpreads * 2}`;
    } else {
      DOM.pageIndicator.textContent = `Pages ${startPage}–${endPage} of ${state.totalPagesSpreads * 2}`;
    }
  }
}

// --- Navigation Actions ---
function nextPage() {
  const viewport = DOM.readerViewport;
  const nextScrollLeft = (state.currentPageSpread + 1) * viewport.clientWidth;
  
  if (nextScrollLeft < viewport.scrollWidth) {
    viewport.scrollTo({
      left: nextScrollLeft,
      behavior: 'smooth'
    });
  }
}

function prevPage() {
  const viewport = DOM.readerViewport;
  const prevScrollLeft = (state.currentPageSpread - 1) * viewport.clientWidth;
  
  if (prevScrollLeft >= 0) {
    viewport.scrollTo({
      left: prevScrollLeft,
      behavior: 'smooth'
    });
  }
}

// --- Drag-to-Scroll (Mouse Gestures) ---
function setupDragToScroll() {
  const viewport = DOM.readerViewport;
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;

  viewport.addEventListener('mousedown', (e) => {
    isDown = true;
    viewport.classList.add('grabbing');
    viewport.style.scrollSnapType = 'none'; // Disable snapping during drag
    startX = e.pageX - viewport.offsetLeft;
    scrollLeft = viewport.scrollLeft;
  });

  viewport.addEventListener('mouseleave', () => {
    if (!isDown) return;
    isDown = false;
    viewport.classList.remove('grabbing');
    viewport.style.scrollSnapType = 'x mandatory'; // Restore snapping
  });

  viewport.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    viewport.classList.remove('grabbing');
    viewport.style.scrollSnapType = 'x mandatory'; // Restore snapping
    
    // Snap to closest page spread manually if it doesn't trigger automatically
    const pageWidth = viewport.clientWidth;
    const targetSpread = Math.round(viewport.scrollLeft / pageWidth);
    viewport.scrollTo({
      left: targetSpread * pageWidth,
      behavior: 'smooth'
    });
  });

  viewport.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - viewport.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed multiplier
    viewport.scrollLeft = scrollLeft - walk;
  });

  // Track scroll position changes to update header/footer info
  viewport.addEventListener('scroll', () => {
    // Only update indicators if not dragging, or debounced
    const isWide = window.innerWidth > 768;
    const actualCols = (state.layoutColumns === '2' || (state.layoutColumns === 'auto' && isWide)) ? 2 : 1;
    updatePaginationIndicator(actualCols);
  });
}

// --- Event Handlers & View Switches ---
function setupGlobalListeners() {
  // Navigation
  DOM.backButton.addEventListener('click', () => {
    switchView('library');
    state.activeBook = null;
  });
  
  DOM.prevPageBtn.addEventListener('click', prevPage);
  DOM.nextPageBtn.addEventListener('click', nextPage);
  
  // Keyboard nav
  document.addEventListener('keydown', (e) => {
    if (state.currentView !== 'reader') return;
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      nextPage();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevPage();
    } else if (e.key === 'Escape') {
      DOM.settingsPanel.classList.add('hidden');
    }
  });

  // Click on progress bar to jump to section
  DOM.progressContainer.addEventListener('click', (e) => {
    const rect = DOM.progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    
    const targetSpread = Math.round(percentage * (state.totalPagesSpreads - 1));
    const targetScroll = targetSpread * DOM.readerViewport.clientWidth;
    
    DOM.readerViewport.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  });

  // Settings panel toggle
  DOM.settingsToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    DOM.settingsPanel.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!DOM.settingsPanel.classList.contains('hidden') && !DOM.settingsPanel.contains(e.target as Node) && e.target !== DOM.settingsToggle) {
      DOM.settingsPanel.classList.add('hidden');
    }
  });

  // Theme change buttons
  DOM.settingsPanel.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme') as any;
      if (theme) {
        setTheme(theme);
      }
    });
  });

  // Font size buttons
  DOM.fontDecrease.addEventListener('click', () => {
    if (state.fontSize > 12) {
      setFontSize(state.fontSize - 1);
    }
  });
  
  DOM.fontIncrease.addEventListener('click', () => {
    if (state.fontSize < 32) {
      setFontSize(state.fontSize + 1);
    }
  });

  // Layout selection buttons
  DOM.settingsPanel.querySelectorAll('.layout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cols = btn.getAttribute('data-columns') as any;
      if (cols) {
        setLayoutColumns(cols);
      }
    });
  });

  // Resize handler
  let resizeTimeout: any;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      recalculatePages();
    }, 150);
  });

  // Online/offline transition listeners
  window.addEventListener('online', () => {
    fetchLibrary();
  });
  window.addEventListener('offline', () => {
    fetchLibrary();
  });
}

function switchView(view: 'library' | 'reader') {
  state.currentView = view;
  if (view === 'library') {
    DOM.libraryView.classList.remove('hidden');
    DOM.readerView.classList.add('hidden');
    DOM.settingsPanel.classList.add('hidden');
    document.title = 'bookie — Horizontal Book Reader';
  } else {
    DOM.libraryView.classList.add('hidden');
    DOM.readerView.classList.remove('hidden');
    if (state.activeBook) {
      document.title = `bookie — ${state.activeBook.metadata.title}`;
    }
  }
}

// --- Theme and Settings Controllers ---
function setTheme(theme: 'paper' | 'sepia' | 'charcoal' | 'night') {
  state.theme = theme;
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('bookie-theme', theme);

  // Update active buttons
  DOM.settingsPanel.querySelectorAll('.theme-btn').forEach(btn => {
    if (btn.getAttribute('data-theme') === theme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function setFontSize(size: number) {
  state.fontSize = size;
  DOM.fontSizeDisplay.textContent = `${size}px`;
  document.documentElement.style.setProperty('--reader-font-size', `${size}px`);
  localStorage.setItem('bookie-font-size', String(size));
  
  // Re-paginate content since sizing changed text flow
  recalculatePages();
}

function setLayoutColumns(mode: 'auto' | '1' | '2') {
  state.layoutColumns = mode;
  localStorage.setItem('bookie-layout', mode);

  // Update active buttons
  DOM.settingsPanel.querySelectorAll('.layout-btn').forEach(btn => {
    if (btn.getAttribute('data-columns') === mode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Re-paginate content
  recalculatePages();
}

function loadSavedSettings() {
  const savedTheme = localStorage.getItem('bookie-theme') as any;
  if (savedTheme) setTheme(savedTheme);
  
  const savedSize = localStorage.getItem('bookie-font-size');
  if (savedSize) setFontSize(parseInt(savedSize, 10));
  
  const savedLayout = localStorage.getItem('bookie-layout') as any;
  if (savedLayout) setLayoutColumns(savedLayout);
}

// --- Loading Utils ---
function showLoading() {
  DOM.loading.classList.remove('hidden');
}

function hideLoading() {
  DOM.loading.classList.add('hidden');
}

// --- String Utils ---
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop() || '';
}

// Start app
init();
