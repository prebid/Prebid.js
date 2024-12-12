self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (url.hostname === 'local.prebid.org') {
        event.respondWith(
            (async () => {
                const blobUri = url.searchParams.get('blobUri');
                return fetch(blobUri);
            })()
        );
    }
});