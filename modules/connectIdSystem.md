## Yahoo ConnectID User ID Submodule

Yahoo ConnectID user ID Module.

### Prebid Params

```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'connectId',
            storage: {
                name: 'connectId',
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
The below parameters apply only to the Yahoo ConnectID user ID Module.

| Param under usersync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID value for the Yahoo ConnectID module - `"connectId"` | `"connectId"` |
| params | Required | Object | Data for Yahoo ConnectID initialization. | |
| params.pixelId | Required | Number | The Yahoo supplied publisher specific pixel Id  | `8976` |
| params.he | Required | String | The SHA-256 hashed user email address | `"529cb86de31e9547a712d9f380146e98bbd39beec"` |
