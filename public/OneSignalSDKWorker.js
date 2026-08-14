// Le SDK OneSignal vient de leur CDN. importScripts() est SYNCHRONE et FATAL :
// si le CDN repond une erreur, TOUT le script echoue a s evaluer et le service
// worker meurt -- on perd alors le cache hors ligne et le mode PWA en plus des
// notifications. On isole donc cette dependance tierce.
try {
  importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
} catch (e) {
  console.error("[SW] SDK OneSignal indisponible, notifications inactives", e);
}

const CACHE_NAME = "courses-v6";
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
        // Une reponse issue d une redirection ne peut pas etre renvoyee telle
        // quelle a une navigation : le navigateur la refuse ("a redirected
        // response was used for a request whose redirect mode is not follow")
        // et affiche une erreur reseau a la place de l application.
        //
        // Or le middleware redirige en permanence ("/" -> "/fr", non connecte
        // -> "/login"), et "/" est le start_url du manifeste : c est donc le
        // lancement de la PWA installee qui cassait. On reconstruit une reponse
        // equivalente, debarrassee du marqueur de redirection.
        if (isNavigate && response.redirected) {
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }

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
