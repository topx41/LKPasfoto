// Service Worker for Liankhay Capture Manager PWA & Share Target
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle POST requests for /share-target
  if (event.request.method === 'POST' && (url.pathname === '/share-target' || url.pathname === '/api/share-target')) {
    event.respondWith((async () => {
      try {
        const reqClone = event.request.clone();
        const response = await fetch(reqClone);
        return response;
      } catch (err) {
        console.warn("SW fetch to /share-target failed, running SW fallback:", err);
        try {
          const reqClone2 = event.request.clone();
          const formData = await reqClone2.formData();
          const file = formData.get('file') || formData.get('files') || formData.get('document');
          const text = formData.get('text') || formData.get('title') || formData.get('url');

          if (file || text) {
            const cache = await caches.open('pwa-share-store');
            let fileName = 'Shared_File.xlsx';
            if (file && typeof file === 'object' && file.name) {
              fileName = file.name;
            }
            const backupPayload = {
              text: text ? String(text) : '',
              fileName,
              timestamp: Date.now()
            };
            await cache.put('/sw-latest-share', new Response(JSON.stringify(backupPayload)));
          }
        } catch (e) {
          console.error("SW FormData parse failed:", e);
        }
        return Response.redirect('/?sw_fallback=true', 303);
      }
    })());
    return;
  }
});



