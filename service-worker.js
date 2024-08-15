self.addEventListener('fetch', function (event) {
    // Intercept requests and reroute them
    if (event.request.url.startsWith('https://abhijit-108.github.io/Dairy-App/proxy')) {
        const newUrl = event.request.url.replace('https://abhijit-108.github.io/Dairy-App/proxy', 'http://192.168.1.1');
        event.respondWith(fetch(newUrl));
    }
});
