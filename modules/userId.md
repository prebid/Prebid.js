## User ID Example Configuration

Example showing `cookie` storage for user id data for both submodules
```
pbjs.setConfig({
    usersync: {
        userIds: [{
            name: "unifiedId",
            params: {
                partner: "prebid",
                url: "http://match.adsrvr.org/track/rid?ttd_pid=prebid&fmt=json"
            },
            storage: {
                type: "cookie",
                name: "unifiedid",
                expires: 60
            }
        }, {
            name: "pubCommonId",
            storage: {
                type: "cookie",
                name: "_pubcid",
                expires: 60
            }
        }],
        syncDelay: 5000
    }
});
```

Example showing `cookie` storage for user id data for id5 submodule
```
pbjs.setConfig({
    usersync: {
        userIds: [{
            name: "id5Id",
            params: {
                partner: 173 // @TODO: Set your real ID5 partner ID here for production, please ask for one contact@id5.io
            },
            storage: {
                type: "cookie",
                name: "id5id",
                expires: 90
            }
        }],
        syncDelay: 5000
    }
});
```

Example showing `localStorage` for user id data for both submodules
```
pbjs.setConfig({
    usersync: {
        userIds: [{
            name: "unifiedId",
            params: {
                partner: "prebid",
                url: "http://match.adsrvr.org/track/rid?ttd_pid=prebid&fmt=json"
            },
            storage: {
                type: "html5",
                name: "unifiedid",
                expires: 60
            }
        }, {
            name: "pubCommonId",
            storage: {
                type: "html5",
                name: "pubcid",
                expires: 60
            }
        }],
        syncDelay: 5000
    }
});
```

Example showing how to configure a `value` object to pass directly to bid adapters
```
pbjs.setConfig({
    usersync: {
        userIds: [{
            name: "pubCommonId",
            value: {
              "providedPubCommonId": "1234567890"
            }
        }],
        syncDelay: 5000
    }
});
```
