// Service Worker for Liankhay Capture Manager PWA & Share Target
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Intercept Web Share Target POST requests from WhatsApp, Telegram, File Manager, Android Share Sheet, etc.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (
    event.request.method === 'POST' &&
    (url.pathname.includes('share-target') ||
      url.pathname === '/' ||
      url.search.includes('share_target'))
  ) {
    event.respondWith(
      (async () => {
        try {
          const reqClone = event.request.clone();
          const formData = await reqClone.formData();

          // 1. Try forwarding form data to backend Express server API
          try {
            const apiRes = await fetch('/api/share-target', {
              method: 'POST',
              body: formData,
              headers: { Accept: 'application/json' },
            });

            if (apiRes.ok) {
              const json = await apiRes.json();
              if (json && json.tempId) {
                return Response.redirect('/?shared_import_id=' + json.tempId + '&t=' + Date.now(), 303);
              }
            }
          } catch (apiErr) {
            console.warn('SW API fetch error, falling back to local cache:', apiErr);
          }

          // 2. Fallback: Save file or text into local SW Cache Storage
          let sharedFile = null;
          let sharedText = formData.get('text') || formData.get('title') || formData.get('url') || '';

          for (const [key, value] of formData.entries()) {
            if (value && typeof value === 'object' && value.size > 0 && ('name' in value || 'type' in value)) {
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
                  'x-file-name': encodeURIComponent(sharedFile.name || 'Excel_Diterima.xlsx'),
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
          console.error('SW share_target error:', err);
        }

        return Response.redirect('/?shared_import=ready&t=' + Date.now(), 303);
      })()
    );
  }
});

