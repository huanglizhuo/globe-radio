/* Globe Radio service worker (plain JS, served as-is from /public).
 *
 * Strategy:
 * - /assets/* (hashed build output): cache-first, network fallback.
 * - Navigations: network-first, offline fallback to the cached app shell.
 * - Everything else (API, station pages, audio streams): untouched pass-through.
 */
const STATIC_CACHE = 'gr-static-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.add('/'))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle same-origin GET requests.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Hashed build assets: cache-first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.status === 200) {
          cache.put(request, response.clone());
        }
        return response;
      }),
    );
    return;
  }

  // Page navigations: network-first, offline fallback to the cached shell.
  // Navigations are never cached (includes /station/{uuid} pages).
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')));
    return;
  }

  // Everything else — /api/, station data, audio streams, remote tiles —
  // passes through untouched (no respondWith).
});
