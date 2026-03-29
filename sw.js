// ================================================================
// Entretien PWA — Service Worker
// Stratégie : Cache-First pour le shell, Network-First pour le reste
// Incrémente CACHE_VER à chaque déploiement pour invalider le cache
// ================================================================

const CACHE_VER  = 'entretien-v1';
const SHELL      = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
];

// ── Install : on pré-cache le shell ──────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VER)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())   // active immédiatement
  );
});

// ── Activate : on supprime les anciens caches ─────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_VER)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())  // prend le contrôle des onglets ouverts
  );
});

// ── Fetch : Cache-First avec fallback réseau ──────────────────────
self.addEventListener('fetch', event => {
  // On ne gère que les requêtes GET same-origin
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Pas en cache → réseau, puis mise en cache
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_VER).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => {
        // Offline et pas en cache : retourne index.html comme fallback
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
