// ═══════════════════════════════════════════════════════
// SERVICE WORKER — Bulgarisch Lern-App (KidsLearn)
// Network-first for the document (so new deploys load fresh
// when online), cache-first for static assets (offline support).
// ═══════════════════════════════════════════════════════

const CACHE_NAME = "kidslearn-v1.1.0";

// Static assets safe to pre-cache (the app itself is inline in index.html)
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// ── Install: pre-cache core assets ──
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .catch(() => {})          // never let one 404 block install
      .then(() => self.skipWaiting())
  );
});

// ── Activate: drop old caches ──
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ──
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (req.url.startsWith("chrome-extension")) return;

  const isDocument =
    req.mode === "navigate" || req.destination === "document";

  if (isDocument) {
    // NETWORK-FIRST: always try fresh HTML, fall back to cache offline
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put("/index.html", copy));
          return res;
        })
        .catch(() => caches.match(req).then(c => c || caches.match("/index.html")))
    );
    return;
  }

  // CACHE-FIRST for everything else (fonts, icons, manifest)
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (!res || res.status !== 200 || res.type === "opaque") return res;
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
        return res;
      }).catch(() => undefined);
    })
  );
});

self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
