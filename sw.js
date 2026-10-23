/* Service worker : fonctionne hors ligne.
   Incrémente CACHE à chaque mise à jour des fichiers pour forcer le rafraîchissement. */
const CACHE = "muscu-v4";
const ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "css/style.css",
  "js/utils.js",
  "js/data.js",
  "js/state.js",
  "js/ui.js",
  "js/charts.js",
  "js/router.js",
  "js/views/dashboard.js",
  "js/views/workouts.js",
  "js/views/library.js",
  "js/views/stats.js",
  "js/views/profile.js",
  "js/session.js",
  "js/vendor/supabase.js",
  "js/config.js",
  "js/cloud.js",
  "js/app.js",
  "data/config.json",
  "data/exercises.json",
  "data/workouts.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((k) =>
        Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x))),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(r, { ignoreSearch: true }).then((hit) => {
      const net = fetch(r)
        .then((res) => {
          if (res.ok) {
            const cp = res.clone();
            caches.open(CACHE).then((c) => c.put(r, cp));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    }),
  );
});
