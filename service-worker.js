
const CACHE = 'rihlati-view-shell-v4';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// تثبيت الإصدار الجديد وجلب الملفات المحدثة

self.addEventListener('install', e => {

  e.waitUntil(

    caches.open(CACHE)

      .then(cache => cache.addAll(

        ASSETS.map(url =>

          new Request(url, {
            cache: 'reload'
          })

        )

      ))

      .then(() => self.skipWaiting())

  );

});

// حذف الإصدارات القديمة من التخزين المؤقت

self.addEventListener('activate', e => {

  e.waitUntil(

    caches.keys()

      .then(keys => Promise.all(

        keys.filter(key =>

          key.startsWith('rihlati-view-shell-') &&
          key !== CACHE

        ).map(key => caches.delete(key))

      ))

      .then(() => self.clients.claim())

  );

});

// جلب أحدث الملفات من الإنترنت

self.addEventListener('fetch', e => {

  const url = new URL(e.request.url);

  if (
    url.origin === self.location.origin &&
    e.request.method === 'GET'
  ) {

    e.respondWith(

      fetch(e.request)

        .catch(() => caches.match(e.request))

    );

  }

});
