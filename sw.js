/* Service worker: la app abre al instante desde el equipo (los datos SIEMPRE van a la red).
   Subir CACHE con cada publicación: es también la versión de los archivos (?v=) que se guardan. */
var CACHE = "scat-on-v3.9.5";
var V = CACHE.replace("scat-on-v", "");
var JS = ["catalogos", "api", "app", "firma", "docs", "evento", "guia", "historico", "ia", "analisis", "tablero"];
var ARCHIVOS = ["./", "index.html", "img/logo.svg", "img/logo-oscuro.svg", "img/logo.png", "img/icon.svg", "manifest.json"]
  .concat(JS.map(function (f) { return "js/" + f + ".js?v=" + V; }));
var EXTERNOS = /^https:\/\/(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;   // librería de gráficos y fuente (versiones fijas)

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARCHIVOS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE && k !== "scat-ext"; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
function guardar(nombre, req, r) { if (r && (r.ok || r.type === "opaque")) { var c = r.clone(); caches.open(nombre).then(function (ca) { ca.put(req, c); }); } return r; }
function primeroGuardado(nombre, req) {               // archivos que no cambian sin cambiar de URL: del equipo, sin esperar a la red
  return caches.match(req).then(function (h) { return h || fetch(req).then(function (r) { return guardar(nombre, req, r); }); });
}
self.addEventListener("fetch", function (e) {
  var req = e.request, u = new URL(req.url);
  if (req.method !== "GET") return;
  if (EXTERNOS.test(req.url)) return e.respondWith(primeroGuardado("scat-ext", req));
  if (u.origin !== location.origin) return;                                      // servidor de datos (Apps Script): siempre red
  if (u.searchParams.has("v") || /\.(svg|png|json)$/.test(u.pathname)) return e.respondWith(primeroGuardado(CACHE, req));
  // La página: red primero (así llega la versión nueva apenas se publica) y, sin conexión, la guardada.
  e.respondWith(fetch(req, { cache: "no-cache" }).then(function (r) { return guardar(CACHE, req, r); }).catch(function () { return caches.match(req).then(function (h) { return h || caches.match("index.html"); }); }));
});
