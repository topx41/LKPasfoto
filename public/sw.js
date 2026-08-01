// Service Worker for Liankhay Capture Manager PWA & Share Target
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Intercept Web Share Target POST requests safely from Android Share Sheet
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (
    event.request.method === 'POST' &&
    (url.pathname.includes('share-target') ||
      url.pathname === '/' ||
      url.search.includes('share'))
  ) {
    event.respondWith(
      (async () => {
        try {
          const reqClone = event.request.clone();
          const formData = await reqClone.formData();

          let sharedFile = null;
          let sharedText = formData.get('text') || formData.get('title') || formData.get('url') || '';

          // Find uploaded file from form data
          for (const [key, value] of formData.entries()) {
            if (value && typeof value === 'object' && value.size > 0 && ('name' in value || 'type' in value)) {
              sharedFile = value;
              break;
            }
          }

          const cache = await caches.open('shared-files-cache');

          if (sharedFile) {
            await cache.put(
              '/shared-excel-file',
              new Response(sharedFile, {
                headers: {
                  'x-file-name': encodeURIComponent(sharedFile.name || 'Excel_Diterima.xlsx'),
                  'content-type': sharedFile.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                },
              })
            );
          } else if (sharedText && String(sharedText).trim().length > 0) {
            await cache.put(
              '/shared-text-data',
              new Response(String(sharedText), {
                headers: {
                  'content-type': 'text/plain; charset=utf-8',
                },
              })
            );
          }

          // Try syncing to Express backend as well (non-blocking)
          try {
            fetch('/api/share-target', {
              method: 'POST',
              body: formData,
            }).catch(() => {});
          } catch (e) {}

          const redirectUrl = new URL('/?shared_import=ready&t=' + Date.now(), self.location.origin).href;
          return Response.redirect(redirectUrl, 303);
        } catch (err) {
          console.error('SW share_target error:', err);
          const fallbackUrl = new URL('/?shared_import=ready&t=' + Date.now(), self.location.origin).href;
          return Response.redirect(fallbackUrl, 303);
        }
      })()
    );
  }
});



