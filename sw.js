/* Service worker: network-first so updates always arrive; cache is only an offline fallback. */
const CACHE = 'wwcd-v6';
const CORE = ['/', '/index.html', '/chip-scan.js?v=3', '/skin.js?v=15', '/bottom-nav.js?v=4', '/terms-gate.js?v=7', '/rooms.js?v=5', '/admin.js?v=3', '/icon-192.png', '/spade-home-icon-v2.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Supabase, Google, CDNs: always straight to the network
  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('/index.html') : Response.error())))
  );
});
