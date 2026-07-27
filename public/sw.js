// Service Worker for Foto Studio Manager PWA & Share Target
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Intercept fetch if offline
self.addEventListener('fetch', (event) => {
  // Let standard network requests pass through
});
