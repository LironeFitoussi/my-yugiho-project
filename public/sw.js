// Static-asset service worker. Never caches HTML, RSC payloads, server actions or API data.
const STATIC_CACHE = "ygo-static-v1";
const IMAGE_CACHE = "ygo-card-images-v1";
const CURRENT_CACHES = [STATIC_CACHE, IMAGE_CACHE];
const IMAGE_MAX_ENTRIES = 300;
const CARD_IMAGE_PREFIX = "https://images.ygoprodeck.com/images/cards_small/";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => !CURRENT_CACHES.includes(key)).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  const path = url.pathname;
  return (
    path.startsWith("/_next/static/") ||
    path.startsWith("/icons/") ||
    path === "/apple-touch-icon.png" ||
    path === "/manifest.webmanifest"
  );
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  // cache.keys() returns entries in insertion order: delete the oldest first.
  for (let i = 0; i < keys.length - maxEntries; i++) await cache.delete(keys[i]);
}

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    await cache.put(request, response.clone());
    if (maxEntries) await trimCache(cacheName, maxEntries);
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  if (request.url.startsWith(CARD_IMAGE_PREFIX)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, IMAGE_MAX_ENTRIES));
  }
  // Everything else (navigations, RSC, server actions, /api/*) goes straight to the network.
});
