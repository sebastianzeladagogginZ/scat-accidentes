/* Service worker: carga instantánea de la app (los datos SIEMPRE van a la red).
   Subir CACHE con cada publicación para que los usuarios reciban la nueva versión. */
var CACHE = "scat-on-v2.6";
var ARCHIVOS = ["./", "index.html", "js/catalogos.js", "js/api.js", "js/app.js", "js/firma.js", "js/docs.js", "js/evento.js", "img/logo.svg", "img/logo-oscuro.svg", "img/logo.png", "img/icon.svg", "manifest.json"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARCHIVOS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;          // API y CDN: siempre red
  e.respondWith(fetch(e.request).then(function (r) {                                   // red primero, caché de respaldo
    var c = r.clone(); caches.open(CACHE).then(function (ca) { ca.put(e.request, c); }); return r;
  }).catch(function () { return caches.match(e.request); }));
});
