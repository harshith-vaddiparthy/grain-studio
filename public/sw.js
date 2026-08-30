/* Grain Studio service worker.

   Caching strategy, and why it is shaped this way:

   - Navigations are NETWORK FIRST. The previous version served the cached
     document first, which permanently pinned returning visitors to whichever
     HTML they happened to fetch on their first visit. Because that HTML
     references content-hashed bundles, those visitors could never receive a new
     release. The last successful document response is retained purely as the
     offline fallback.
   - /assets/* is CACHE FIRST. Vite emits content-hashed filenames there, so
     those responses are immutable and safe to serve from cache indefinitely.
   - Everything else same-origin is STALE WHILE REVALIDATE, which keeps the
     manifest, icons, and bundled sample responsive while still refreshing.

   Bump CACHE_VERSION when the caching strategy changes. The activate handler
   deletes every cache whose name does not match the current one, which is what
   evicts the stale grain-studio-v1 document for existing installations. */

const CACHE_VERSION = "v2";
const CACHE = `grain-studio-${CACHE_VERSION}`;
const OFFLINE_DOCUMENT = "/";
const PRECACHE = ["/", "/manifest.webmanifest", "/icons/icon.svg", "/samples/studio-sample.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

const isStorable = (response) => Boolean(response) && response.ok && response.type === "basic";

const store = (request, response) => {
  if (!isStorable(response)) return;
  const copy = response.clone();
  caches
    .open(CACHE)
    .then((cache) => cache.put(request, copy))
    .catch(() => undefined);
};

const networkFirstDocument = async (request) => {
  try {
    const response = await fetch(request);
    store(OFFLINE_DOCUMENT, response);
    return response;
  } catch {
    const cached = await caches.match(OFFLINE_DOCUMENT);
    return cached || Response.error();
  }
};

const cacheFirst = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  store(request, response);
  return response;
};

const staleWhileRevalidate = async (request) => {
  const cached = await caches.match(request);
  const revalidated = fetch(request)
    .then((response) => {
      store(request, response);
      return response;
    })
    .catch(() => undefined);
  if (cached) return cached;
  return (await revalidated) || Response.error();
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(networkFirstDocument(request));
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
