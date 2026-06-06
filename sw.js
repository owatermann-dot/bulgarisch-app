// ═══════════════════════════════════════════════════════
// SERVICE WORKER — Bulgarisch Lern-App
// Cache-first strategy for full offline support
// ═══════════════════════════════════════════════════════

const CACHE_NAME = "bulgarisch-v1.0.0";

// All assets to pre-cache on install
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/app.js",
  "/manifest.json",
  "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap"
];

// ── Install: pre-cache all assets ──
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_ASSETS.filter(url => !url.startsWith("http")));
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ──
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first, fallback to network ──
self.addEventListener("fetch", event => {
  // Skip non-GET and chrome-extension requests
  if (event.request.method !== "GET") return;
  if (event.request.url.startsWith("chrome-extension")) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Only cache valid responses
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }
        // Cache a clone
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => {
        // Offline fallback for navigation
        if (event.request.destination === "document") {
          return caches.match("/index.html");
        }
      });
    })
  );
});

// ── Background sync for future use ──
self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
