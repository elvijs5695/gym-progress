const CACHE_NAME = 'gym-progress-pwa-v1.5.16';
const APP_SHELL = [
  "./.nojekyll",
  "./VERSION.txt",
  "./app.js",
  "./autoregulation.js",
  "./db.js",
  "./exercise-library.js",
  "./exercise-identity.js",
  "./exercise-catalogue.js",
  "./exercise-catalogue.json",
  "./exercise-migration-map.js",
  "./exercise-migration-map.json",
  "./future-adjustment.js",
  "./finish-celebration.png",
  "./i18n.js",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-64.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-master.png",
  "./icons/catalogue-link.png",
  "./icons/social-completed-workout.png",
  "./icons/social-record-trophy.png",
  "./icons/undo-arrow.png",
  "./index.html",
  "./manifest.webmanifest",
  "./manual.js",
  "./metrics.js",
  "./performance-rules.js",
  "./performance-rules.json",
  "./performance-rule-cases.json",
  "./recovery.html",
  "./starter-programme.js",
  "./social-api.js",
  "./social-config.js",
  "./styles.css"
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  const codeLike = /\.(?:js|css|json|html|webmanifest)$/.test(url.pathname) || url.pathname.endsWith('/VERSION.txt');
  if (codeLike) {
    // Network-first prevents a newly deployed entry module from being paired with stale
    // dependency modules from the previous service-worker cache. Ignore the query only
    // for the offline fallback so versioned imports can still start offline.
    event.respondWith(
      fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => caches.match(request, {ignoreSearch:true}))
    );
    return;
  }

  event.respondWith(
    caches.match(request, {ignoreSearch:true}).then(cached => cached || fetch(request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }))
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients => {
      const existing = clients.find(client => 'focus' in client);
      if (existing) return existing.focus();
      return self.clients.openWindow ? self.clients.openWindow('./') : undefined;
    })
  );
});
