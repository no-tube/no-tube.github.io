/* no-tube service worker — app-shell cache only, no YouTube/API caching */
const VERSION = 'v2.2.0';
const CACHE = `notube-${VERSION}`;
const APP_SHELL = [
  './',
  './index.html',
  './app.js',
  './api-client.js',
  './tailwind.css',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('notube-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ---- Reklam / takip engelleyici ----
// Sayfanın kendi yaptığı reklam/takip isteklerini ağa çıkmadan keser.
// Not: cross-origin iframe'in İÇİNDEN giden isteklere SW karışamaz; bu yüzden
// reklam gösteren YouTube embed'ı hiç kullanılmıyor (yerine Invidious var).
const AD_HOSTS = [
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
  'adservice.google.com', 'google-analytics.com', 'analytics.google.com',
  'googletagmanager.com', 'ads.youtube.com'
];
const AD_SIGNS = [
  '/pagead/', '/api/stats/ads', 'get_midroll_', '/ptracking',
  'adformat=', 'pltype=ad', 'pltype%3Dad', '&ad_type=', 'adunit='
];

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  let url;
  try { url = new URL(request.url); } catch { return; }

  const host = url.hostname;
  if (
    AD_HOSTS.some((h) => host === h || host.endsWith('.' + h)) ||
    AD_SIGNS.some((s) => url.pathname.includes(s) || url.search.includes(s))
  ) {
    event.respondWith(new Response(null, { status: 204, statusText: 'ad-blocked' }));
    return;
  }

  // Cross-origin (YouTube API, thumbnails, embeds): never cache, go network-only.
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, fall back to cached index.html for offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html', { ignoreSearch: true }))
    );
    return;
  }

  // Code and styles: network-first so new deployments apply immediately,
  // falling back to the cached copy when offline.
  const dest = request.destination;
  if (dest === 'script' || dest === 'style' || dest === 'worker' || dest === 'document') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request, { ignoreSearch: false }))
    );
    return;
  }

  // Other same-origin assets (images, fonts): cache-first, then network + populate cache.
  event.respondWith(
    caches.match(request, { ignoreSearch: false }).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
    )
  );
});
