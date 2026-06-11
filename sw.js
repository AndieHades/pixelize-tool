/* global self, caches, fetch */
// Service worker: офлайн-кеш приложения (cache-first для статики, фолбэк на index.html).
const CACHE = 'pixel-editor-v20';
const ASSETS = ['./', './index.html', './style.css', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './js/01-state.js', './js/02-convert.js', './js/03-render.js', './js/04-history.js', './js/05-draw.js',
  './js/06-selection.js', './js/07-input.js', './js/08-palette.js', './js/09-layers-ui.js', './js/10-import.js',
  './js/11-export.js', './js/12-app.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match('./index.html'))),
  );
});
