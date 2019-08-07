## Prebid.js BritePool User ID Submodule

There are two ways to use the BritePool User ID Submodule. The Publisher Kit may be used to create a Prebid usersync.userIds compatible array element, or you may set the Prebid usersync.userIds params manually.

### Publisher Kit

The BritePool Publisher Kit getPrebidUserConfig() will return a usersync.userIds compatible element.

api_key - Provided by BritePool

Set as part of script load:
```
<script async type="text/javascript" id="britepool_publisher_kit" src="https://cdn.britepool.com/publisher_kit.js?api_key=xxx"></script>
```

Within your current setConfig():
```
pbjs.setConfig({
    usersync: {
        userIds: [window.britepool.getPrebidUserConfig()]
    }
});
```

getPrebidUserConfig(identifiers) may optionally be given additional identifiers: aaid, dtid, idfa, ilid, luid, mmid, msid, mwid, rida, ssid, hash.

### Prebid params

Individual params may be set for the BritePool User ID Submodule.
```
pbjs.setConfig({
    usersync: {
        userIds: [{
            name: ’britepoolId’,
            storage: {
                name: ‘britepoolid’,
                type: ‘cookie’,
                expires: 30
            },
            params: {
                api_key: ’xxx’,
                hash: ’yyyy’ // example identifier
            }
        }]
    }
});
```

### Async Command Queue

Loading dependent scripts asynchronously can be a challenge. The BritePool Publisher Kit provides a command queue similar to the Prebid (cmd, que). This will allow commands to be queued prior and after the script is async loaded.

Within your code:
```
window.britepool = window.britepool || {};
window.britepool.cmd = window.britepool.cmd || [];
```

An example of async loading both BritePool Publisher Kit and Prebid:
```
window.britepool = window.britepool || {};
window.britepool.cmd = window.britepool.cmd || [];
var pbjs = pbjs || {};
pbjs.que = pbjs.que || [];
window.britepool.cmd.push(function() {
    pbjs.que.push(function() {
        // Both BritePool Publisher Kit and Prebid are loaded
    });
});
```
