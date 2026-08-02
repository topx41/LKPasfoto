// Service Worker for Liankhay Capture Manager PWA & Share Target
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Allow POST requests for /share-target to go directly to network so Android native browser handles 303 Redirects seamlessly
  if (event.request.method === 'POST' && (url.pathname === '/share-target' || url.pathname === '/api/share-target' || url.pathname === '/')) {
    return;
  }
});




