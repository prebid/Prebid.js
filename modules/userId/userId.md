## User ID Example Configuration

Example showing `cookie` storage for user id data for available submodules
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: "unifiedId",
            params: {
                partner: "prebid",
                url: "//match.adsrvr.org/track/rid?ttd_pid=prebid&fmt=json"
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
        }, {
            name: 'identityLink',
            params: {
               pid: '999' // Set your real identityLink placement ID here 
            },
            storage: {
              type: 'cookie',
              name: 'idl_env',
              expires: 60
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
        }, {
            name: 'identityLink',
            params: {
                pid: '999' // Set your real identityLink placement ID here 
            },
            storage: {
                type: 'html5',
                name: 'idl_env',
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
