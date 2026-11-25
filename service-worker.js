
// ==========================================
// مصروفاتي V1.0
// Service Worker
// ==========================================

const CACHE = 'rihlati-view-shell-v5';

const CACHE_PREFIX = 'rihlati-view-shell-';

const SCOPE = self.registration.scope;


// ==========================================
// 1. ملفات التطبيق المسموح بتخزينها
// ==========================================

const ASSETS = [

  './',

  './index.html',

  './manifest.webmanifest',

  './icons/icon-180.png',

  './icons/icon-192.png',

  './icons/icon-512.png'

];

const ALLOWED_URLS = new Set(

  ASSETS.map(path => new URL(path, SCOPE).href)

);


// ==========================================
// 2. تثبيت الإصدار الجديد
// ==========================================

self.addEventListener('install', event => {

  event.waitUntil(

    (async () => {

      const cache = await caches.open(CACHE);

      await cache.addAll(

        ASSETS.map(path =>

          new Request(

            new URL(path, SCOPE).href,

            { cache: 'reload' }

          )

        )

      );

      await self.skipWaiting();

    })()

  );

});


// ==========================================
// 3. حذف الإصدارات القديمة
// ==========================================

self.addEventListener('activate', event => {

  event.waitUntil(

    (async () => {

      const keys = await caches.keys();

      await Promise.all(

        keys

          .filter(key =>

            key.startsWith(CACHE_PREFIX) &&

            key !== CACHE

          )

          .map(key => caches.delete(key))

      );

      await self.clients.claim();

    })()

  );

});


// ==========================================
// 4. تحديد الملفات المسموح بتخزينها
// ==========================================

function getCacheKey(request) {

  if (request.method !== 'GET') {

    return null;

  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {

    return null;

  }

  // عدم تخزين أي رابط يحتوي على رمز المشاهدة.

  if (url.searchParams.has('key')) {

    return null;

  }

  // السماح بملفات التطبيق المحددة فقط.

  if (ALLOWED_URLS.has(url.href)) {

    return url.href;

  }

  // دعم فتح الصفحة الرئيسية مع معاملات
  // إضافية مثل روابط المشاركة والتتبع،
  // دون تخزين هذه المعاملات.

  if (request.mode === 'navigate') {

    const root = new URL('./', SCOPE);

    const index = new URL('./index.html', SCOPE);

    if (

      url.pathname === root.pathname ||

      url.pathname === index.pathname

    ) {

      return index.href;

    }

  }

  return null;

}


// ==========================================
// 5. صفحة بديلة عند انقطاع الإنترنت
// ==========================================

function offlinePage() {

  return new Response(

    `<!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport"
            content="width=device-width, initial-scale=1">
      <title>مصروفاتي | لا يوجد اتصال</title>
      <style>
        body {
          margin: 0;
          background: #f1f7fa;
          color: #173349;
          font-family: Tahoma, Arial, sans-serif;
          min-height: 100vh;
          display: grid;
          place-items: center;
        }

        .card {
          background: white;
          width: min(85%, 420px);
          padding: 28px;
          border-radius: 20px;
          text-align: center;
          box-shadow: 0 4px 20px #17334918;
          box-sizing: border-box;
        }

        h1 {
          color: #063456;
          font-size: 26px;
        }

        p {
          line-height: 1.9;
          font-size: 14px;
        }

        button {
          background: #087f83;
          color: white;
          border: 0;
          border-radius: 10px;
          padding: 13px 25px;
          font-family: inherit;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>💳 مصروفاتي</h1>
        <h3>لا يوجد اتصال بالإنترنت</h3>
        <p>
          يرجى التحقق من اتصالك بالإنترنت
          ثم إعادة المحاولة.
        </p>
        <p>
          🔒 لا يتم تخزين البيانات المالية
          والفواتير ضمن ذاكرة التطبيق المؤقتة.
        </p>
        <button onclick="location.reload()">
          إعادة المحاولة
        </button>
      </div>
    </body>
    </html>`,

    {

      status: 503,

      headers: {

        'Content-Type': 'text/html; charset=UTF-8',

        'Cache-Control': 'no-store'

      }

    }

  );

}


// ==========================================
// 6. استراتيجية التحديث
// ==========================================
//
// الأولوية للنسخة الموجودة على الإنترنت.
// استخدام النسخة المؤقتة عند تعذر الاتصال.
// تخزين ملفات الواجهة المحددة فقط.
//
// ==========================================

async function networkFirst(request, cacheKey) {

  try {

    const response = await fetch(

      request,

      { cache: 'no-cache' }

    );

    if (

      response.ok &&

      response.type === 'basic' &&

      !response.redirected

    ) {

      try {

        const cache = await caches.open(CACHE);

        await cache.put(

          cacheKey,

          response.clone()

        );

      } catch (error) {

        // استمرار التطبيق حتى عند تعذر التخزين.

      }

    }

    if (response.status >= 500) {

      throw new Error('Server unavailable');

    }

    return response;

  } catch (error) {

    try {

      const cache = await caches.open(CACHE);

      const cached = await cache.match(cacheKey);

      if (cached) {

        return cached;

      }

    } catch (cacheError) {

      // استخدام الاستجابة البديلة.

    }

    if (request.mode === 'navigate') {

      return offlinePage();

    }

    return new Response(

      'Resource unavailable',

      {

        status: 503,

        headers: {

          'Content-Type': 'text/plain',

          'Cache-Control': 'no-store'

        }

      }

    );

  }

}


// ==========================================
// 7. معالجة طلبات التطبيق
// ==========================================

self.addEventListener('fetch', event => {

  const request = event.request;

  const cacheKey = getCacheKey(request);

  // عدم اعتراض أو تخزين طلبات البيانات
  // المالية أو Google Apps Script
  // أو صور الفواتير أو رموز المشاهدة.

  if (!cacheKey) {

    return;

  }

  event.respondWith(

    networkFirst(request, cacheKey)

  );

});


// ==========================================
// MASROFATI V1.0
// نهاية الكود
// ==========================================
