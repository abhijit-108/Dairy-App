const CACHE_NAME = 'my-site-cache-v6';
const urlsToCache = [ 
  'css/main-screen.css?v=1.1.9',
  'js/include_name_email.js?v=1.1.2'
];

self.addEventListener('install', function(event) {
  console.log('Service worker install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Caching files');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  console.log('Fetch event');
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          console.log('Cache hit');
          return response;
        }
        console.log('Cache miss, fetching from network');
        return fetch(event.request);
      }
    )
  );
});