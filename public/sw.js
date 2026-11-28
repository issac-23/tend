// tend service worker — offline cache + notification handling.
// Bumped to v3 to invalidate stale v2 caches.

const CACHE = 'tend-v5';
const SHELL = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-180.png',
  '/icon-maskable-512.png',
  '/badge-96.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // The sync API must always hit the network: never cache it.
  if (url.pathname.startsWith('/api/')) return;

  const isHTML = req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html');

  // Network-first for HTML so a deploy is seen on next load. Cache fallback if offline.
  if (isHTML) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/').then((r) => r || caches.match(req)))
    );
    return;
  }

  // Cache-first for hashed assets (Vite content-hashes filenames so new builds = new URLs).
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = clientsArr.find((c) => c.url.includes(self.location.origin));
    if (existing) {
      await existing.focus();
      existing.navigate('/');
    } else {
      await self.clients.openWindow('/');
    }
  })());
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag !== 'tend-daily') return;
  event.waitUntil((async () => {
    const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clientsArr) c.postMessage({ type: 'check-reminder' });
  })());
});
