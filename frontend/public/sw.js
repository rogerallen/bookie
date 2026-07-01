const CACHE_NAME = 'bookie-shell-v11';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/favicon.svg'
];

// Install Service Worker and precache structural shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate and clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && !key.startsWith('bookie-books-') && key !== 'bookie-api-v1') {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Intercept network requests (Network-First, Cache-Fallback)
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Cache API index (/api/books) with Network-First strategy to support offline list viewing
  if (url.pathname.endsWith('/api/books')) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open('bookie-api-v1').then((cache) => {
              cache.put(e.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(e.request);
        })
    );
    return;
  }

  // Skip other local backend API requests
  // The client side app handles book downloading/retrieval via Cache Storage directly
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Handle static assets and shell pages (Cache-First, fallback to Network)
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(e.request)
        .then((response) => {
          // Cache successful responses for subsequent offline loads
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to index.html for SPA client routing
          if (e.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
    })
  );
});
