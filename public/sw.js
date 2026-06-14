const CACHE_NAME = "courses-v4";
const OFFLINE_URL = "/offline.html";
const SHELL_URLS = [
  OFFLINE_URL,
  "/",
  "/fr/dashboard",
  "/fr/attendance",
  "/fr/payments",
  "/fr/students",
  "/fr/groups",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isApi = url.pathname.startsWith("/api/");
  const isNavigate = event.request.mode === "navigate";

  if (isApi) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('{"error":"offline"}', {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (isNavigate) return caches.match(OFFLINE_URL);
          return new Response("", { status: 503 });
        })
      )
  );
});
