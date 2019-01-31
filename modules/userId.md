
## Example Configurations
```
pbjs.setConfig({
    debug: true,
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
                name: "pubcid",
                expires: 60
            }
        }],
        syncDelay: 5000
    }
});
```
