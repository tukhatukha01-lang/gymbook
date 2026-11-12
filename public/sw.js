/* GymBook Service Worker — офлайн-оболочка и контролируемые обновления.
   При изменении списка файлов или логики обязательно поднимайте VERSION. */
const VERSION = '1.1.0';
const CACHE = 'gymbook-shell-v' + VERSION;
const SHELL = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './fonts/manrope-cyrillic.woff2',
  './fonts/manrope-cyrillic-ext.woff2',
  './fonts/manrope-latin.woff2',
  './fonts/manrope-latin-ext.woff2'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/healthz')) return;

  /* Страницы: сеть → кэш → офлайн-заглушка.
     Ответы 4xx/5xx (прокси, упавший сервер) тоже считаем недоступностью сети. */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put('./index.html', copy));
          return response;
        }
        return caches.match('./index.html').then(hit => hit || response);
      }).catch(() =>
        caches.match('./index.html').then(hit => hit || caches.match('./offline.html'))
      )
    );
    return;
  }

  /* Файлы приложения: из кэша сразу + фоновое обновление (stale-while-revalidate). */
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(cached => {
      const network = fetch(req).then(response => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return response;
      }).catch(() => cached);
      if (cached) {
        event.waitUntil(network.catch(() => {}));
        return cached;
      }
      return network;
    })
  );
});
