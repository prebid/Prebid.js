## Verizon Media User ID Submodule

Verizon Media User ID Module.

### Prebid Params

```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'verizonMedia',
            storage: {
                name: 'vmuid',
                type: 'cookie',
                expires: 30
            },
            params: {
                he: '0bef996248d63cea1529cb86de31e9547a712d9f380146e98bbd39beec70355a'
            }
        }]
    }
});
```
## Parameter Descriptions for the `usersync` Configuration Section
The below parameters apply only to the Verizon Media User ID Module integration.

| Param under usersync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID value for the Verizon Media module - `"verizonMedia"` | `"verizonMedia"` |
| params | Required | Object | Data for Verizon Media ID initialization. | |
| params.he | Required | String | The SHA-256 hashed user email address | `"529cb86de31e9547a712d9f380146e98bbd39beec"` |
| storage | Required | Object | The publisher must specify the local storage in which to store the results of the call to get the user ID. This can be either cookie or HTML5 storage. | |
| storage.type | Required | String | This is where the results of the user ID will be stored. The recommended method is `localStorage` by specifying `html5`. | `"html5"` |
| storage.name | Required | String | The name of the cookie or html5 local storage where the user ID will be stored. | `"vmuid"` |
| storage.expires | Optional | Integer | How long (in days) the user ID information will be stored. | `365` |
