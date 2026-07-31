// Service Worker for Liankhay Capture Manager PWA & Share Target
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass POST requests (like Web Share Target multipart file uploads) straight to Express server
self.addEventListener('fetch', (event) => {
  if (event.request.method === 'POST') {
    // Let POST requests bypass Service Worker so Chrome Android sends multipart stream directly to backend Express server
    return;
  }
});


