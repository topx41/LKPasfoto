// Service Worker for Liankhay Capture Manager PWA & Share Target
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass POST share_target requests directly to backend server to process via multer safely
self.addEventListener('fetch', (event) => {
  if (event.request.method === 'POST') {
    // Let POST requests (such as Web Share Target multipart uploads) pass directly to Express server
    return;
  }
});

