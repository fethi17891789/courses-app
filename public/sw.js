importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE_NAME = "courses-v5";
// Separate, long-lived cache for subject PDFs + the PDF.js worker. Kept across app
// shell version bumps so a PDF a student already viewed is served for free (no egress).
const PDF_CACHE = "subjects-pdf-v1";
const OFFLINE_URL = "/offline.html";
const SHELL_URLS = [
  OFFLINE_URL,
  "/",
  "/fr/dashboard",
  "/fr/attendance",
  "/fr/payments",
  "/fr/students",
  "/fr/groups",
  "/pdf.worker.min.mjs",
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
          .filter((key) => key !== CACHE_NAME && key !== PDF_CACHE)
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

  // Subject PDFs (Supabase Storage): cache-first so repeat views cost no egress.
  if (url.pathname.includes("/storage/v1/object/")) {
    event.respondWith(
      caches.open(PDF_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const resp = await fetch(event.request);
          if (resp.ok) cache.put(event.request, resp.clone());
          return resp;
        } catch {
          const fallback = await cache.match(event.request);
          return fallback || new Response("", { status: 503 });
        }
      })
    );
    return;
  }

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
