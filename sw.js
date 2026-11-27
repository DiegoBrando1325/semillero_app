/* Semillero — service worker: guarda la app para usarla sin internet. Tus datos no pasan por aquí. */
const VERSION = 'semillero-v0.4.0';
const SHELL = [
  './', 'index.html', 'styles.css?v=0.4.0', 'manifest.webmanifest', 'js/db.js?v=0.4.0', 'js/vault.js?v=0.4.0', 'js/ai.js?v=0.4.0', 'js/fountain.js?v=0.4.0', 'js/core.js?v=0.4.0', 'js/ink.js?v=0.4.0', 'js/links.js?v=0.4.0', 'js/map.js?v=0.4.0', 'js/views-ideas.js?v=0.4.0', 'js/views-agenda.js?v=0.4.0', 'js/views-cine.js?v=0.4.0', 'js/views-settings.js?v=0.4.0', 'js/views-journal.js?v=0.4.0', 'js/journal-tree.js?v=0.4.0', 'js/nuclei.js?v=0.4.0', 'js/tags.js?v=0.4.0', 'js/app.js?v=0.4.0', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
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
