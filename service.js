const CACHE_NAME = 'my-site-cache-v10';
const urlsToCache = [
  '/Dairy-App/',
  '/Dairy-App/css/main-screen.css?v=1.2.2',
  '/Dairy-App/js/include_name_email.js?v=1.1.2'
];

self.addEventListener('install', function(event) {
  console.log('Service worker install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Caching files');
        return Promise.all(urlsToCache.map(url => {
          return cache.add(url).then(function() {
            console.log(`Successfully cached: ${url}`);
          }).catch(function(error) {
            console.error(`Failed to cache: ${url}`, error);
          });
        }));
      })
      .then(function() {
        console.log('All files successfully cached');
      })
      .catch(function(error) {
        console.error('Error caching files:', error);
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
      })
  );
});