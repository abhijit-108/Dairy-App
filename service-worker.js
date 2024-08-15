self.addEventListener('fetch', function (event) {
    // Intercept requests and reroute them
    if (event.request.url.startsWith('https://your-https-site.com/proxy')) {
        const newUrl = event.request.url.replace('https://your-https-site.com/proxy', 'http://192.168.1.1');
        event.respondWith(fetch(newUrl));
    }
});
