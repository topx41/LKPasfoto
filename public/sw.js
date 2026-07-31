// Service Worker for Liankhay Capture Manager PWA & Share Target
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Intercept Web Share Target POST requests safely (returns 200 OK HTML redirect page to avoid Chrome Android POST redirect crash)
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
                return createHtmlRedirectResponse('/?shared_import_id=' + json.tempId + '&t=' + Date.now(), '⚡ Data Excel Diterima!', 'Memuat preview & mapping customer...');
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
            return createHtmlRedirectResponse('/?imported_share=true&t=' + Date.now(), '⚡ File Excel Diterima!', 'Membuka preview data...');
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
            return createHtmlRedirectResponse('/?imported_text_share=true&t=' + Date.now(), '⚡ Teks Diterima!', 'Membuka preview customer...');
          }
        } catch (err) {
          console.error('SW share_target error:', err);
        }

        return createHtmlRedirectResponse('/?shared_import=ready&t=' + Date.now(), 'Liankhay Capture', 'Membuka aplikasi...');
      })()
    );
  }
});

function createHtmlRedirectResponse(targetUrl, title, message) {
  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { background: #020617; color: #f8fafc; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; text-align: center; }
    .card { background: #0f172a; border: 1px solid #38bdf8; padding: 28px; border-radius: 16px; max-width: 400px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .spinner { width: 40px; height: 40px; border: 4px solid #1e293b; border-top-color: #38bdf8; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { margin: 0 0 8px; font-size: 1.2rem; color: #38bdf8; }
    p { margin: 0; color: #94a3b8; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2>${title}</h2>
    <p>${message}</p>
  </div>
  <script>
    setTimeout(function() {
      window.location.replace(${JSON.stringify(targetUrl)});
    }, 100);
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}


