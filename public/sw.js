// Service Worker for Liankhay Capture Manager PWA & Share Target
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Safely pass Web Share Target POST requests directly to the Express backend
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (
    event.request.method === 'POST' &&
    (url.pathname.includes('share-target') || url.pathname === '/')
  ) {
    event.respondWith(
      fetch(event.request).catch((err) => {
        console.error('SW share_target POST error:', err);
        return Response.redirect('/?share_error=true', 303);
      })
    );
  }
});



