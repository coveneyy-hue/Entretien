// ================================================================
// Entretien PWA — Service Worker
// Stratégie :
// - Network-First pour les navigations HTML
// - Cache-First pour les assets statiques same-origin
// Incrémente CACHE_VER à chaque déploiement pour invalider le cache
// ================================================================

const CACHE_VER  = 'entretien-v2';
const SHELL      = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  './icon.svg',
];

// ── Install : on pré-cache le shell ──────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VER)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
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
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // HTML / navigation : toujours essayer le réseau d'abord
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const toCache = response.clone();
            caches.open(CACHE_VER).then(cache => cache.put('./index.html', toCache));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Assets : cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const toCache = response.clone();
          caches.open(CACHE_VER).then(cache => cache.put(event.request, toCache));
          return response;
        });
    })
  );
});

// ── Message : forcer l'activation immédiate ───────────────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
