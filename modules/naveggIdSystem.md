## Navegg User ID Submodule

For assistance setting up your module please contact us at [prebid@navegg.com](prebid@navegg.com).

### Prebid Params

Individual params may be set for the IDx Submodule.
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'naveggId',
            storage: {
                name : 'nvggid',
                type : 'cookie&html5',
                expires: 8
            }
        }]
    }
});
```
## Parameter Descriptions for the `userSync` Configuration Section
The below parameters apply only to the naveggID integration.

| Param under usersync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID of the module - `"naveggId"` | `"naveggId"` |
| storage.name | Required | String | The name of the cookie or html5 local storage where the user ID will be stored.	 | `"nvggid"` |
| storage.type | Required | String | Must be "`cookie`", "`html5`" or "`cookie&html5`". This is where the results of the user ID will be stored.	| `"cookie&html5"` |
| storage.expires | Required | Integer | How long (in days) the user ID information will be stored. | `8` |
