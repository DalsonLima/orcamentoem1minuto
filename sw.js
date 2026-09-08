const CACHE = "orcamento-1min-v1";
const ARQUIVOS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// HTML: tenta a rede primeiro (pra sempre pegar a versão mais nova), cai pro cache se offline.
// Resto (ícones, manifest, fontes): cache primeiro, com a rede como reforço.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const ehNavegacao = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  if (ehNavegacao) {
    e.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copia));
          return resp;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cacheado) => {
      const rede = fetch(req)
        .then((resp) => {
          if (resp && resp.status === 200 && resp.type !== "opaque") {
            const copia = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return resp;
        })
        .catch(() => cacheado);
      return cacheado || rede;
    })
  );
});
