/* Treeline offline helper. Bump VERSION whenever you upload a new index.html. */
const VERSION = 'treeline-d3';
const SHELL = ['./', './index.html', './css/app.css', './js/config.js', './js/core.js', './js/util.js', './js/data.js', './js/draw.js', './js/ui.js', './js/screens/_shared.js', './js/screens/forecast.js', './js/screens/locker.js', './js/screens/range.js', './js/screens/zero.js', './js/screens/stands.js', './js/screens/journal.js', './js/screens/stand.js', './js/screens/setup.js', './js/main.js',
  './ammo.json', './manifest.json', './icon-192.png', './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'];
const TILE_HOSTS = ['server.arcgisonline.com', 'tile.opentopomap.org', 'tile.openstreetmap.org'];
const TILE_LIMIT = 800;   // map squares kept for offline use

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== 'tiles').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
async function trimTiles(){ const c = await caches.open('tiles'); const keys = await c.keys();
  for (let i = 0; i < keys.length - TILE_LIMIT; i++) await c.delete(keys[i]); }
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.includes('open-meteo.com')) return;                       // weather: always live (the app keeps its own copy)
  if (TILE_HOSTS.some(h => url.hostname.endsWith(h))) {                       // map squares: saved as you view them
    e.respondWith(caches.open('tiles').then(async c => { const hit = await c.match(req); if (hit) return hit;
      const res = await fetch(req); if (res.ok || res.type === 'opaque') { c.put(req, res.clone()); trimTiles(); } return res; }));
    return;
  }
  if (req.mode === 'navigate' || url.origin === location.origin) {             // the app itself: newest when online, saved copy offline
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {   // fonts and the map library: saved after first use
    const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })));
});
