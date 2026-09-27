const CACHE_NAME = 'memora-v1.5.1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './biblioteca151.css',
  './biblioteca151.js',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './docs/Manual_Memora_v1.5.1_ES.pdf',
  './docs/Manual_Memora_v1.5.1_EN.pdf',
  './docs/Manual_Memora_v1.5.1_PT.pdf'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((res) => res || fetch(e.request))
  );
});
