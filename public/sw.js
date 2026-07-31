// Service Worker for Liankhay Capture Manager PWA & Share Target
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Intercept Web Share Target POST requests from other apps (WhatsApp, File Manager, Android Share, etc.)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (
    event.request.method === 'POST' &&
    (url.pathname.includes('share-target') ||
      url.search.includes('share_target') ||
      url.pathname === '/api/share-target' ||
      url.pathname === '/')
  ) {
    event.respondWith(
      (async () => {
        try {
          const reqClone = event.request.clone();
          const formData = await reqClone.formData();
          
          let sharedFile = null;
          let sharedText = formData.get('text') || formData.get('title') || formData.get('url') || '';

          // Search all entries for any File object
          for (const [key, value] of formData.entries()) {
            if (value && typeof value === 'object' && value instanceof File && value.size > 0) {
              sharedFile = value;
              break;
            }
          }

          if (sharedFile) {
            const cache = await caches.open('shared-files-cache');
            await cache.put(
              '/shared-excel-file',
              new Response(sharedFile, {
                headers: {
                  'x-file-name': encodeURIComponent(sharedFile.name || 'Imported_Excel.xlsx'),
                  'content-type': sharedFile.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                },
              })
            );
            return Response.redirect('/?imported_share=true&t=' + Date.now(), 303);
          } else if (sharedText && String(sharedText).trim().length > 0) {
            const cache = await caches.open('shared-files-cache');
            await cache.put(
              '/shared-text-data',
              new Response(String(sharedText), {
                headers: {
                  'content-type': 'text/plain; charset=utf-8',
                },
              })
            );
            return Response.redirect('/?imported_text_share=true&t=' + Date.now(), 303);
          }
        } catch (err) {
          console.error('Error in SW handling share_target, passing through to server:', err);
        }

        // Pass through to Express server handler (/api/share-target)
        try {
          return await fetch(event.request);
        } catch (fetchErr) {
          return Response.redirect('/?shared_import=failed', 303);
        }
      })()
    );
  }
});
