// Service worker: guarda l'app al dispositiu perquè funcioni sense connexió.
// Canvia VERSIO cada cop que publiquis canvis perquè els mòbils s'actualitzin.
const VERSIO = 'suplementapp-v3';
const FITXERS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/rules.js',
  './js/aliments.js',
  './js/fitxes.js',
  './js/horari.js',
  './js/pdf.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];
// Recursos externs que es guarden per poder-los fer servir sense connexió (si es poden baixar).
const EXTERNS = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
];
const EXTERNS_ORIGENS = ['https://cdnjs.cloudflare.com', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

self.addEventListener('install', (ev) => {
  ev.waitUntil((async () => {
    const c = await caches.open(VERSIO);
    await c.addAll(FITXERS);
    await Promise.all(EXTERNS.map((u) => c.add(u).catch(() => { /* s'intentarà més tard */ })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((claus) => Promise.all(claus.filter((k) => k !== VERSIO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET') return;
  const url = new URL(ev.request.url);

  // Externs (llibreria PDF i tipografia): primer la còpia guardada; si no n'hi ha, xarxa i es guarda.
  if (EXTERNS_ORIGENS.includes(url.origin)) {
    ev.respondWith(
      caches.match(ev.request).then((desat) => desat || fetch(ev.request).then((resp) => {
        if (resp.ok || resp.type === 'opaque') {
          const copia = resp.clone();
          caches.open(VERSIO).then((c) => c.put(ev.request, copia));
        }
        return resp;
      })),
    );
    return;
  }
  if (url.origin !== location.origin) return;

  // Fitxers propis: xarxa primer (per tenir sempre la darrera versió) i, sense connexió, la còpia guardada.
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
