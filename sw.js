const CACHE_NAME = 'memora-v1.5.2-unificado-' + encodeURIComponent(self.registration.scope);
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './fonts.css',
  './biblioteca151.css',
  './biblioteca151.js',
  './app.js',
  './demo154.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './docs/Manual_Memora_v1.5.1_ES.pdf',
  './docs/Manual_Memora_v1.5.1_EN.pdf',
  './docs/Manual_Memora_v1.5.1_PT.pdf',
  './docs/Manual_Memora_v1.5.2_ES.pdf',
  './docs/Manual_Memora_v1.5.2_EN.pdf',
  './docs/Manual_Memora_v1.5.2_PT.pdf'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS.map(asset => new Request(asset, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(key => key.startsWith('memora-') && key !== CACHE_NAME).map(async key => {
        // Remove only this installation's assets; retain other Memora folders.
        const cache = await caches.open(key);
        await Promise.all(ASSETS.map(asset => cache.delete(new URL(asset, self.registration.scope).href, {ignoreSearch: true})));
        if ((await cache.keys()).length === 0) await caches.delete(key);
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE_NAME)
      .then(cache => cache.match(e.request, { ignoreSearch: true }))
      .then(res => res || fetch(e.request))
  );
});
