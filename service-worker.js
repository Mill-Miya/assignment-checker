const CACHE_NAME = "assignment-checker-v9";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css?v=8",
  "./script.js?v=8",
  "./manifest.json",
  "./assets/brand/r-logo-black.svg",
  "./icon-192.png",
  "./icon-512.png"
];

// インストール時に、アプリに必要なファイルを保存します。
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// 古いキャッシュが残っていたら削除します。
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// オフラインでも開けるよう、保存済みファイルを優先して返します。
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
