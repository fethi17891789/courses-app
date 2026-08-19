// Le SDK OneSignal vient de leur CDN. importScripts() est SYNCHRONE et FATAL :
// si le CDN repond une erreur, TOUT le script echoue a s evaluer et le service
// worker meurt -- on perd alors le cache hors ligne et le mode PWA en plus des
// notifications. On isole donc cette dependance tierce.
try {
  importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
} catch (e) {
  console.error("[SW] SDK OneSignal indisponible, notifications inactives", e);
}

const CACHE_NAME = "courses-v7";
const PDF_CACHE = "subjects-pdf-v1";
const OFFLINE_URL = "/offline.html";
// Filet de securite ultime : si meme /offline.html n a pas pu etre mis en cache,
// on sert cet ecran minimal plutot que de laisser respondWith() sans reponse
// (ce qui affiche la page d erreur du navigateur).
const FALLBACK_HTML = [
  '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
  '<meta name="theme-color" content="#7c3aed"><title>Courses &mdash; Hors ligne</title><style>',
  '*{margin:0;padding:0;box-sizing:border-box}',
  'body{font-family:system-ui,sans-serif;background:#f0ecff;color:#1e1b4b;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px}',
  '.card{background:#fff;border-radius:32px;padding:48px 32px;max-width:360px;width:100%;text-align:center;box-shadow:0 4px 24px rgba(124,58,237,.08)}',
  'h1{font-size:22px;font-weight:800;margin-bottom:12px}',
  'p{font-size:15px;color:#64748b;line-height:1.5;margin-bottom:32px}',
  'button{font:700 16px system-ui,sans-serif;color:#fff;background:#7c3aed;border:0;border-radius:16px;padding:14px 32px;box-shadow:0 4px 0 #5b21b6}',
  '</style></head><body><div class="card"><h1>Pas de connexion</h1>',
  '<p>Verifiez votre connexion internet puis reessayez.</p>',
  '<button onclick="location.reload()">Reessayer</button></div></body></html>',
].join("");

function offlineResponse() {
  return caches.match(OFFLINE_URL).then(
    (cached) =>
      cached ||
      new Response(FALLBACK_HTML, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
  );
}
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
    caches.open(CACHE_NAME).then(async (cache) => {
      // La page hors ligne est la seule ressource vraiment critique : on la met
      // en cache a part, avec cache-buster, pour ne pas dependre du reste.
      try {
        const resp = await fetch(OFFLINE_URL, { cache: "reload" });
        if (resp.ok) await cache.put(OFFLINE_URL, resp);
      } catch (e) {
        console.error("[SW] mise en cache de la page hors ligne impossible", e);
      }
      await Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)));
    })
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
    )
      .then(async () => {
        // Rattrapage si l install s est faite sans reseau.
        try {
          const cache = await caches.open(CACHE_NAME);
          const resp = await fetch(OFFLINE_URL, { cache: "reload" });
          if (resp.ok) await cache.put(OFFLINE_URL, resp);
        } catch {}
      })
      .then(() => clients.claim())
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
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // Sans reponse ici, le navigateur affiche SA page d erreur : on garantit
        // donc toujours un ecran hors ligne pour les navigations.
        if (isNavigate) return offlineResponse();
        return new Response("", { status: 503 });
      })
  );
});
