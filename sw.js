/* Semillero — service worker: guarda la app para usarla sin internet. Tus datos no pasan por aquí. */
const VERSION = 'semillero-v0.1.0';
const SHELL = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/db.js', 'js/vault.js', 'js/ai.js', 'js/fountain.js', 'js/core.js',
  'js/views-ideas.js', 'js/views-agenda.js', 'js/views-cine.js', 'js/views-settings.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return; /* la API de Claude va directo */
  /* Red primero para recibir actualizaciones; si no hay internet, usa la copia guardada. */
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
