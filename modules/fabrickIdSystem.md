## Neustar Fabrick User ID Submodule

Fabrick ID Module - https://www.home.neustar/fabrick
Product and Sales Inquiries: 1-855-898-0036

## Example configuration for publishers:
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'fabrickId',
            storage: {
                name: 'pbjs_fabrickId',
                type: 'cookie',
                expires: 7
            },
            params: {
                apiKey: 'your apiKey', // provided to you by Neustar
                e: '31c5543c1734d25c7206f5fd591525d0295bec6fe84ff82f946a34fe970a1e66' // example hash identifier (sha256)
            }
        }]
    }
});
```
