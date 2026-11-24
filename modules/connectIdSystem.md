## Yahoo ConnectID User ID Submodule

Yahoo ConnectID user ID Module.

*Note: The storage config should be ommited as the module handles the storage of the needed information.

### Prebid Params

```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'connectId',
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
| params.pixelId | Required unless `endpoint` is set | Number or String | The Yahoo-supplied publisher-specific pixel ID. Used in the default endpoint URL (`https://ups.analytics.yahoo.com/ups/<pixelId>/fed`) and sent as the `pixelId` query parameter. | `"0000"` |
| params.endpoint | Required unless `pixelId` is set | String | ID endpoint URL. Replaces the default pixel URL; the query string is appended after a `?`. | `"https://example.com/ups/fed"` |
| params['1p'] | Optional | Boolean, Number or String | Flags the request as first-party. `1`, `'1'` or `true` sends `1p=1`; anything else, including omitting it, sends `1p=0`. | `true` |
| params.he | Optional | String | The SHA-256 hashed user email address which has been lowercased prior to hashing. |`"ed8ddbf5a171981db8ef938596ca297d5e3f84bcc280041c5880dba3baf9c1d4"`|
| params.puid | Optional | String | A domain-specific user identifier such as a first-party cookie. If not passed, a puid value will be auto-generated and stored in local and / or cookie storage. | `"ab9iibf5a231ii1db8ef911596ca297d5e3f84biii00041c5880dba3baf9c1da"` |
