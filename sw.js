/* Bump VERSION on every release alongside the ?v= asset params in the HTML.
   The versioned cache name purges stale entries; the query string stays part
   of the cache key so ?v= bumps actually fetch fresh files. */
const VERSION = "v16";
const CACHE = "karle-kitchen-" + VERSION;
const CORE = [
  "/",
  "/index.html",
  "/recipes.html",
  "/recipe.html",
  "/about.html",
  "/add.html",
  "/styles.css",
  "/app.js",
  "/recipes.json",
  "/family-photos.json",
  "/manifest.json",
  "/images/icon-192.png",
  "/images/icon-512.png",
  "/images/placeholder.svg",
  "/images/favicon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin) return;

  // Recipes data and page navigations: network first so new recipes show up,
  // falling back to cache when offline.
  if (url.pathname.endsWith(".json") || event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets: cache first, keyed by full URL (query string included,
  // so ?v= cache-busters fetch fresh files on each release).
  event.respondWith(
    caches
      .match(event.request)
      .then(
        (hit) =>
          hit ||
          fetch(event.request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
            return res;
          })
      )
  );
});
