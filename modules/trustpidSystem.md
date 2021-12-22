## trustpid User Id Submodule

trustpid User Id Module.

First, make sure to add the trustpid submodule to your Prebid.js package with:

```
gulp build --modules=trustpid,userId
```

The following configuration parameters are available:

```
pbjs.setConfig({
    userSync: {
        userIds: [
            {
                name: 'trustpid',
                params: {
                    maxDelayTime: 1000, 
                    mnoDomainFallback: 'tmi.example.com',
                    acrFallback: 'xxxx',
                }
                bidders: ["adform"],
                storage: {
                    type: "html5",
                    name: "trustpid",
                    expires: 60, //days
                },
            }
        ],
    }
});
```

## Parameter Descriptions

The below parameters apply only to the Verizon Media User ID Module integration.

| Param under usersync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID value for the Verizon Media module - `"trustpid"` | `"trustpid"` |
| maxDelayTime | Optional | Number | The waiting time for userID data in ms | `1000` |
| mnoDomainFallback | Optional | String | Fallback MNO domain | `"tmi.example.com"` |
| acrFallback | Optional | String | Fallback acronym value | `"xxxx"` |
