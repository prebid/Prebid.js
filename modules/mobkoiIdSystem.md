## Mobkoi User ID Submodule

For assistance setting up your module please contact us at platformteam@mobkoi.com.

### Prebid Params

Individual params may be set for the IDx Submodule.
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'mobkoiId',
            storage: {
                name : 'mobkoi_uid',
                type : 'cookie',
                expires : 30
            }
        }]
    }
});
```
## Parameter Descriptions for the `userSync` Configuration Section
The below parameters apply only to the Mobkoi integration.

| Param under usersync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID of the module - `"mobkoiId"` | `"mobkoiId"` |
| storage.name | Required | String | The name of the cookie local storage where the user ID will be stored.	 | `"mobkoi_uid"` |
| storage.type | Required | String | Must be "`cookie`". This is where the results of the user ID will be stored.	| `"cookie"` |
| storage.expires | Required | Integer | How long (in days) the user ID information will be stored. | `30` |

## Serving the Custom Build Locally

To serve the custom build locally, use the following command:

```sh
gulp serve-fast --modules=consentManagementTcf,tcfControl,mobkoiBidAdapter,mobkoiIdSystem,userId
```
