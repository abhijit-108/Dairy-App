const CACHE_NAME = 'my-site-cache-v1';
const urlsToCache = [
  '/Dairy-App/',
  '/Dairy-App/bill.html',
  '/Dairy-App/button.wav',
  '/Dairy-App/index.html',
  '/Dairy-App/logo.png',
  '/Dairy-App/main.html',
  '/Dairy-App/names.md',
  '/Dairy-App/effect.ogg',
  '/Dairy-App/rewrite Data.html',
  '/Dairy-App/storage page.html',

  // css include
  '/Dairy-App/css/databasepopup.css',
  '/Dairy-App/css/loginpage.css',
  '/Dairy-App/css/main-screen.css',
  '/Dairy-App/css/navbar+sidebar.css',
  '/Dairy-App/css/other-parts.css',
  // js include
  '/Dairy-App/js/database.js',
  '/Dairy-App/js/include_name_email.js',
  '/Dairy-App/js/main-screen.js',
  '/Dairy-App/js/rate.js',
  '/Dairy-App/js/rate.md',
  '/Dairy-App/js/email.js'

];

const dbName = 'my-site-db';
const storeName = 'settings';
const versionKey = 'version';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = event => {
      const db = event.target.result;
      db.createObjectStore(storeName, { keyPath: 'name' });
    };

    request.onsuccess = event => {
      resolve(event.target.result);
    };

    request.onerror = event => {
      reject(event.target.error);
    };
  });
}

function getVersion(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const objectStore = transaction.objectStore(storeName);
    const request = objectStore.get(versionKey);

    request.onsuccess = event => {
      resolve(event.target.result ? event.target.result.value : null);
    };

    request.onerror = event => {
      reject(event.target.error);
    };
  });
}

function setVersion(db, version) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const objectStore = transaction.objectStore(storeName);
    const request = objectStore.put({ name: versionKey, value: version });

    request.onsuccess = event => {
      resolve();
    };

    request.onerror = event => {
      reject(event.target.error);
    };
  });
}

self.addEventListener('install', event => {
  console.log('Service worker installing.');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('All resources cached.');
      })
  );
});

self.addEventListener('fetch', event => {
  console.log('Fetching:', event.request.url);
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('Found in cache:', event.request.url);
          return response;
        }
        console.log('Not found in cache. Fetching from network:', event.request.url);
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  console.log('Service worker activating.');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Function to update cache
async function updateCache() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(urlsToCache);
  console.log('Cache updated with new resources.');
}

// Function to delete old caches
async function deleteOldCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => {
      if (cacheName !== CACHE_NAME) {
        console.log('Deleting old cache:', cacheName);
        return caches.delete(cacheName);
      }
    })
  );
}

// Periodically check for updates
setInterval(() => {
  console.log('Checking for updates...');
  fetch('/Dairy-App/version.txt')
    .then(response => response.text())
    .then(async version => {
      console.log('Current version:', version);
      const db = await openDB();
      const storedVersion = await getVersion(db);
      if (!storedVersion || storedVersion !== version) {
        console.log('New version detected. Updating...');
        await setVersion(db, version);
        await updateCache();
        await deleteOldCaches();
        self.clients.matchAll().then(clients => {
          console.log('Refreshing clients...');
          clients.forEach(client => client.navigate(client.url));
        });
      } else {
        console.log('No new version detected.');
      }
    })
    .catch(error => {
      console.error('Error checking for updates:', error);
    });
}, 60000); // Check every minute