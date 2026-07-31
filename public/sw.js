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
  
  if (event.request.method === 'POST' && (url.pathname.includes('share-target') || url.search.includes('share_target'))) {
    event.respondWith(
      (async () => {
        try {
          // Clone request before reading
          const reqClone = event.request.clone();
          const formData = await reqClone.formData();
          const sharedFile =
            formData.get('excel_file') ||
            formData.get('file') ||
            formData.get('document') ||
            formData.get('shared_file') ||
            formData.get('documents');

          if (sharedFile && sharedFile instanceof File) {
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
            return Response.redirect('/?imported_share=true', 303);
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
