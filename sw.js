/* Bitácora de Entrenamiento — service worker (N-3)
   - Archivos de la app: red primero (siempre la versión más nueva si hay internet) y copia guardada si no hay conexión.
   - Fuentes de Google: se guardan al verse una vez.
   - Nunca toca Drive, inicios de sesión ni otras APIs (siempre van directo a la red). */
const CACHE = "bitacora-v1";
const APP_FILES = ["./", "index.html", "style.css", "data.js", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", ev => {
  ev.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(APP_FILES.map(u => c.add(new Request(u, { cache: "reload" })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", ev => {
  ev.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", ev => {
  const req = ev.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);

  // Fuentes: usar la guardada y actualizarla en segundo plano
  if(FONT_HOSTS.includes(url.hostname)){
    ev.respondWith(
      caches.open(CACHE).then(c => c.match(req).then(hit => {
        const net = fetch(req).then(res => { if(res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }))
    );
    return;
  }

  // Todo lo demás de otros sitios (Drive, Google, Facebook, Imgur…): directo a la red
  if(url.origin !== self.location.origin) return;

  // Archivos de la app: red primero, copia guardada si falla
  ev.respondWith(
    fetch(req).then(res => {
      if(res && res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() =>
      caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === "navigate" ? caches.match("index.html") : Promise.reject("sin conexión")))
    )
  );
});
