// Service worker: guarda l'app al dispositiu perquè funcioni sense connexió.
// Canvia VERSIO cada cop que publiquis canvis perquè els mòbils s'actualitzin.
const VERSIO = 'suplementapp-v2';
const FITXERS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/rules.js',
  './js/aliments.js',
  './js/fitxes.js',
  './js/horari.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(VERSIO).then((c) => c.addAll(FITXERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((claus) => Promise.all(claus.filter((k) => k !== VERSIO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Xarxa primer (per tenir sempre la darrera versió) i, si no hi ha connexió, la còpia guardada.
self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET' || new URL(ev.request.url).origin !== location.origin) return;
  ev.respondWith(
    fetch(ev.request)
      .then((resp) => {
        const copia = resp.clone();
        caches.open(VERSIO).then((c) => c.put(ev.request, copia));
        return resp;
      })
      .catch(() => caches.match(ev.request, { ignoreSearch: true })),
  );
});
