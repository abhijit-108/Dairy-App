self.addEventListener('fetch', function(event) {
    if (event.request.url.startsWith('https://abhijit-108.github.io/Dairy-App/proxy')) {
        const newUrl = event.request.url.replace('https://abhijit-108.github.io/Dairy-App/proxy', 'http://192.168.1.1');
        event.respondWith(
            fetch(newUrl).catch(error => {
                console.error('Fetch failed; returning offline page instead.', error);
                return new Response('Offline or network error', {
                    status: 404,
                    statusText: 'Not Found',
                });
            })
        );
    }
});
