## Gemius User ID Submodule

This module supports [Gemius](https://gemius.com/) customers in using Real Users ID (RUID) functionality.

## Building Prebid.js with Gemius User ID Submodule

To build Prebid.js with the `gemiusIdSystem` module included:

```
gulp build --modules=userId,gemiusIdSystem
```

### Prebid Configuration

You can configure this submodule in your `userSync.userIds[]` configuration:

```javascript
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'gemiusId',
            storage: {
                name: 'pbjs_gemiusId',
                type: 'cookie',
                expires: 30,
                refreshInSeconds: 3600
            }
        }]
    }
});
```
