const CACHE_NAME = "school-app-v1";

// যেসব file cache হবে
const urlsToCache = [
  "/",
  "/offline.html",
];

// 🟢 Install event
self.addEventListener("install", (event) => {
  console.log("SW installed");

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );

  self.skipWaiting();
});

// 🟢 Activate event
self.addEventListener("activate", (event) => {
  console.log("SW activated");

  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      )
    )
  );

  self.clients.claim();
});

// 🟢 Fetch event (offline support)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // clone & store cache
        const resClone = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, resClone);
        });

        return response;
      })
      .catch(() => {
        // offline fallback
        return caches.match(event.request).then((res) => {
          return res || caches.match("/offline.html");
        });
      })
  );
});