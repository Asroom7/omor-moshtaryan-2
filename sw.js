/* sw.js — کش‌کردن پوسته‌ی برنامه برای استفاده‌ی آفلاین */
const CACHE_NAME = 'crm-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './idb.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // فایل‌های پوسته: کش-اول، سپس شبکه
  if (SHELL_FILES.some((f) => req.url.endsWith(f.replace('./', '')) || req.url.endsWith('/'))) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      }).catch(() => cached))
    );
    return;
  }

  // بقیه‌ی درخواست‌ها (مثل فونت): شبکه‌اول با بازگشت به کش
  event.respondWith(
    fetch(req).then((res) => {
      const resClone = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
      return res;
    }).catch(() => caches.match(req))
  );
});
