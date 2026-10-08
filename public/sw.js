// Service worker mínimo — só o necessário para o navegador considerar o
// app instalável (PWA). Sem cache agressivo de rotas dinâmicas (dados
// mudam o tempo todo); cacheia só os assets estáticos do shell.
const CACHE = "negociar-shell-v1";
const SHELL = ["/icon.png", "/brand/n-128.png", "/brand/n.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

// network-first para tudo; cache só serve como fallback de assets estáticos
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});
