// Service Worker for Liankhay Capture Manager PWA & Share Target
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Intercept Web Share Target POST requests from other apps (WhatsApp, File Manager, etc.)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname === '/') {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const sharedFile = formData.get('excel_file') || formData.get('file');
          if (sharedFile) {
            const cache = await caches.open('shared-files-cache');
            await cache.put('/shared-excel-file', new Response(sharedFile));
            return Response.redirect('/?imported_share=true', 303);
          }
        } catch (err) {
          console.error('Error handling share_target in SW:', err);
        }
        return Response.redirect('/', 303);
      })()
    );
  }
});
