/**
 * Service Worker Souverain Dahirah — V1.3 PWA & Expérience Mobile
 * Stratégie :
 * - Navigation : Network-First avec repli sur le cache de l'App Shell (/index.html)
 * - Static Assets (images, fonts, scripts, css) : Stale-While-Revalidate
 * - API Calls (/api/v1/) : Network-Only pour garantir la stricte fraîcheur et la sécurité RBAC
 */

const CACHE_NAME = 'dahirah-pwa-v1.3';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/logo.png',
];

// Installation : pré-mise en cache des assets critiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activation : purge des anciennes versions de caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Interception des requêtes réseau
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Ne jamais intercepter ni mettre en cache les requêtes API REST mutantes ou dynamiques
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 2. Navigation vers une page de l'application (mode HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // 3. Fichiers statiques : polices Google, images, scripts, styles
  if (
    url.origin === self.location.origin ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});
