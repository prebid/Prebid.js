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
| name | Required | String | The name of this module. | `"connectId"` |
| params | Required | Object | Container of all module params. ||
| params.pixelId | Required | Number |
The Yahoo-supplied publisher-specific pixel ID. | `"0000"` |
| params.he | Optional | String | The SHA-256 hashed user email address which has been lowercased prior to hashing. Pass both `he` and `puid` params if present, otherwise pass either of the two that is available. |`"ed8ddbf5a171981db8ef938596ca297d5e3f84bcc280041c5880dba3baf9c1d4"`|
| params.puid | Optional | String | The publisher supplied user identifier such as a first-party cookie. Pass both `he` and `puid` params if present, otherwise pass either of the two that is available. | `"ab9iibf5a231ii1db8ef911596ca297d5e3f84biii00041c5880dba3baf9c1da"` |
