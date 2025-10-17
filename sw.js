const VERSION = 'v5-2025-10-17';
const STATIC_CACHE = `static-${VERSION}`;
const STATIC_ASSETS = [
  '/', '/index.html', '/capture.html', '/style.css', '/app.js', '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    clients.claim(),
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)))
    ),
  ]));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const accept = req.headers.get('accept') || '';
  const isHTML = accept.includes('text/html') || req.destination === 'document' || req.url.endsWith('.html');

  if (isHTML) {
    // ✅ HTML: network-first (si hay red ves lo último; si no, usa caché)
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Otros recursos: cache-first con relleno
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
        return res;
      });
    })
  );
});
