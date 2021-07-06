## BritePool User ID Submodule

BritePool User ID Module. For assistance setting up your module please contact us at [prebid@britepool.com](prebid@britepool.com).

### Prebid Params

Individual params may be set for the BritePool User ID Submodule. 
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'britepoolId',
            storage: {
                name: 'britepoolid',
                type: 'cookie',
                expires: 30
            },
            params: {
                url: 'https://sandbox-api.britepool.com/v1/britepool/id', // optional
                api_key: '3fdbe297-3690-4f5c-9e11-ee9186a6d77c', // provided by britepool
                hash: '31c5543c1734d25c7206f5fd591525d0295bec6fe84ff82f946a34fe970a1e66', // example hash identifier (sha256)
                ssid: '221aa074-57fc-453b-81f0-6c74f628cd5c' // example identifier
            }
        }]
    }
});
```
## Parameter Descriptions for the `usersync` Configuration Section
The below parameters apply only to the BritePool User ID Module integration.

| Param under usersync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID value for the BritePool module - `"britepoolId"` | `"britepoolId"` |
| params | Required | Object | Details for BritePool initialization. | |
| params.api_key | Required | String |BritePool API Key provided by BritePool | "3fdbe297-3690-4f5c-9e11-ee9186a6d77c" |
| params.url | Optional | String |BritePool API url | "https://sandbox-api.britepool.com/v1/britepool/id" |
| params.identifier | Required | String | Where identifier in the params object is the key name. At least one identifier is required. Available Identifiers `aaid` `dtid` `idfa` `ilid` `luid` `mmid` `msid` `mwid` `rida` `ssid` `hash` | `params.ssid` `params.aaid` |
| storage | Required | Object | The publisher must specify the local storage in which to store the results of the call to get the user ID. This can be either cookie or HTML5 storage. | |
| storage.type | Required | String | This is where the results of the user ID will be stored. The recommended method is `localStorage` by specifying `html5`. | `"html5"` |
| storage.name | Required | String | The name of the cookie or html5 local storage where the user ID will be stored. | `"britepoolid"` |
| storage.expires | Optional | Integer | How long (in days) the user ID information will be stored. | `365` |
| value | Optional | Object | Used only if the page has a separate mechanism for storing the BritePool ID. The value is an object containing the values to be sent to the adapters. In this scenario, no URL is called and nothing is added to local storage | `{"primaryBPID": "eb33b0cb-8d35-4722-b9c0-1a31d4064888"}` |
