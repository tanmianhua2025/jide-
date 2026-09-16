const CACHE = "jide-cache-v4";
const CORE = [
  "./",
  "./index.html",
  "./styles.css?v=4",
  "./app.js?v=4",
  "./manifest.webmanifest",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./version.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();

    // 从旧版切到 V4 时，主动让已打开页面重新导航一次。
    // V4 之后主要依靠 controllerchange + version.json 自动切换。
    const clients = await self.clients.matchAll({type:"window", includeUncontrolled:true});
    for (const client of clients) {
      try {
        await client.navigate(client.url);
      } catch(e) {}
    }
  })());
});

self.addEventListener("message", event => {
  if(event.data && event.data.type === "SKIP_WAITING"){
    self.skipWaiting();
  }
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // 页面导航：优先联网，失败再用缓存，避免长期卡在旧 HTML
  if(req.mode === "navigate"){
    event.respondWith(
      fetch(req, {cache:"no-store"})
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(cache => cache.put("./index.html", copy));
          return resp;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // 版本信息永远不使用缓存
  if(url.pathname.endsWith("/version.json")){
    event.respondWith(fetch(req, {cache:"no-store"}));
    return;
  }

  // 同源静态文件：网络优先并同步更新缓存；离线时回退缓存
  if(url.origin === self.location.origin){
    event.respondWith(
      fetch(req)
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
          return resp;
        })
        .catch(() => caches.match(req))
    );
  }
});
