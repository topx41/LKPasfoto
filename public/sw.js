// Service Worker for Liankhay Capture Manager PWA & Share Target
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// IMPORTANT: Do NOT intercept POST requests in Service Worker!
// Letting POST requests bypass Service Worker allows Android Chrome Web Share Target
// to stream multipart file uploads directly to the backend Express server without blank screen crashes.
self.addEventListener('fetch', (event) => {
  if (event.request.method === 'POST') {
    return; // Pass directly to native network / Express server
  }
});



