const CACHE_NAME = 'personnel-tracking-system-pro-v1';
const CORE_ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './favicon.svg',
    './apple-touch-icon.png',
    './icon-192.png',
    './icon-512.png',
    './site.webmanifest'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
    );

    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );

    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') {
        return;
    }

    const requestUrl = new URL(request.url);

    if (requestUrl.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request)
                .then((networkResponse) => {
                    if (!networkResponse.ok) {
                        return networkResponse;
                    }

                    const responseClone = networkResponse.clone();
                    const shouldCache = [
                        'document',
                        'script',
                        'style',
                        'image'
                    ].includes(request.destination) || requestUrl.pathname.endsWith('.webmanifest');

                    if (shouldCache) {
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                    }

                    return networkResponse;
                })
                .catch(() => caches.match('./index.html'));
        })
    );
});
