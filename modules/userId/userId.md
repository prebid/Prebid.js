## User ID Example Configuration

Example showing `cookie` storage for user id data for each of the submodules
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: "pubCommonId",
            storage: {
                type: "cookie",
                name: "_pubcid",
                expires: 60
            }
        }, {
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
            name: "id5Id",
            params: {
                partner: 173 //Set your real ID5 partner ID here for production, please ask for one at http://id5.io/prebid
            },
            storage: {
                type: "cookie",
                name: "id5id",
                expires: 5, // Expiration of cookies in days
                refreshInSeconds: 8*3600 // User Id cache lifetime in seconds, defaulting to 'expires'
            },
        }, {
            name: 'parrableId',
            params: {
                // Replace partner with comma-separated (if more than one) Parrable Partner Client ID(s) for Parrable-aware bid adapters in use
                partner: "30182847-e426-4ff9-b2b5-9ca1324ea09b"
            },
            storage: {
                type: 'cookie',
                name: '_parrable_eid',
                expires: 365
            }
        }, {
            name: 'identityLink',
            params: {
                pid: '999' // Set your real identityLink placement ID here 
            },
            storage: {
                type: 'cookie',
                name: 'idl_env',
                expires: 30
            }
        }, {
            name: 'liveIntentId',
            params: {
                publisherId: '7798696' // Set an identifier of a publisher know to your systems 
            },
            storage: {
                type: 'cookie',
                name: '_li_pbid',
                expires: 60
            }
        }],
        syncDelay: 5000,
        auctionDelay: 1000
    }
});
```

Example showing `localStorage` for user id data for some submodules
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
                expires: 30
            }
        }, {
             name: 'liveIntentId',
             params: {
                 publisherId: '7798696' // Set an identifier of a publisher know to your systems 
             },
             storage: {
                 type: 'html5',
                 name: '_li_pbid',
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
        },
        {
            name: "id5Id",
            value: { "id5id": "ID5-abcdef" }
        },
        {
            name: "netId",
            value: { "netId": "fH5A3n2O8_CZZyPoJVD-eabc6ECb7jhxCicsds7qSg" }
        }],
        syncDelay: 5000
    }
});
```
