## Verizon Media User ID Submodule

Verizon Media User ID Module.

### Prebid Params

```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'verizonMediaId',
            storage: {
                name: 'vmcid',
                type: 'html5',
                expires: 15
            },
            params: {
                pixelId: 58776,
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
| name | Required | String | ID value for the Verizon Media module - `"verizonMediaId"` | `"verizonMediaId"` |
| params | Required | Object | Data for Verizon Media ID initialization. | |
| params.pixelId | Required | Number | The Verizon Media supplied publisher specific pixel Id  | `8976` |
| params.he | Required | String | The SHA-256 hashed user email address | `"529cb86de31e9547a712d9f380146e98bbd39beec"` |
