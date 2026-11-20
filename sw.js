/**
 * ClimateSphere AI — Industrial Offline Service Worker
 * Version: cs-pwa-v4.8.0
 * Provides offline operation for plant inspection tablets in network-shielded boiler rooms
 */

const CACHE_NAME = 'climatesphere-offline-v4.8.1';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './landing.html',
  './manifest.json',
  './assets/logo.svg',
  './css/main.css',
  './js/storage.js',
  './js/i18n.js',
  './js/auth.js',
  './js/telemetryStream.js',
  './js/ragEngine.js',
  './js/documentGenerator.js',
  './js/charts.js',
  './js/app.js',
  './js/pages/dashboard.js',
  './js/pages/carboniq.js',
  './js/pages/cems.js',
  './js/pages/emissions.js',
  './js/pages/scenario.js',
  './js/pages/ai.js',
  './js/pages/calibration.js',
  './js/pages/compliance.js',
  './js/pages/comparison.js',
  './js/pages/climateshield.js',
  './js/pages/energybrain.js',
  './js/pages/admin.js',
  './js/pages/webhooks.js',
];

// Install: Pre-cache all essential application assets gracefully
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching platform assets for offline capability');
      return Promise.allSettled(
        PRECACHE_ASSETS.map(url => cache.add(url).catch(err => {
          console.warn('[ServiceWorker] Pre-cache skipped asset:', url, err.message);
        }))
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up previous cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing stale cache version:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate & Network-First fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip WebSocket, SSE, and real-time live telemetry endpoints from service worker caching
  if (url.pathname.startsWith('/ws') || url.pathname.startsWith('/events') || url.pathname.startsWith('/api/')) {
    return;
  }

  // On localhost, prioritize network first for instant live updates and HMR
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache for next load
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* Offline fallback active */});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return networkResponse;
      }).catch(() => {
        // Fallback to cached index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
