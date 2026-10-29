/* Service Worker – Heizung-Dashboard
 * App-Seite: erst Netz, bei Offline aus dem Cache (Updates kommen so automatisch an).
 * Chart.js und Icons: aus dem Cache.
 * Daten (Google Script, Wetter, ntfy) werden NIE zwischengespeichert. */
const VERSION = 'heizung-v27';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable.png',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/script\.google|googleusercontent|open-meteo|ntfy\.sh/.test(url.hostname)) return;   // Live-Daten

  const isPage = req.mode === 'navigate' || (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname));
  if (isPage) {
    e.respondWith(fetch(req).then(r => {
      const copy = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return r;
    }).catch(() => caches.match('./index.html').then(r => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok && (url.origin === location.origin || url.hostname === 'cdnjs.cloudflare.com')) {
      const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy));
    }
    return r;
  })));
});
