// ホーム画面に追加できるようにするための最小限の Service Worker。
// 記録は Firestore に書くのでオフラインで完結するアプリではない。
// キャッシュするのはページの外枠だけにとどめる。

const CACHE_NAME = "nomisugi-v1";

self.addEventListener("install", () => {
  // 新しい版をすぐ有効にする。古い版が残ると原因の分かりにくい不具合になる
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  // 画面遷移だけ面倒を見る。API やスクリプトに手を出すと
  // 古いバンドルを掴んで不整合を起こす
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone());
        return response;
      } catch {
        // 圏外。前に開けたページがあればそれを出す
        const cached = await caches.match(event.request);
        return cached ?? (await caches.match("/")) ?? Response.error();
      }
    })(),
  );
});
