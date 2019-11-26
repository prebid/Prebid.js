## BritePool User ID Submodule

BritePool User ID Module. For assistance setting up your module please contact us at [prebid@britepool.com](prebid@britepool.com).

### Prebid Params

Individual params may be set for the BritePool User ID Submodule. At least one identifier must be set in the params.
```
pbjs.setConfig({
    usersync: {
        userIds: [{
            name: ’britepoolId’,
            storage: {
                name: ‘britepoolid’,
                type: ‘cookie’,
                expires: 30
            },
            params: {
                url: 'https://sandbox-api.britepool.com/v1/britepool/id', // optional
                api_key: ’xxx’, // provided by britepool
                hash: ’yyyy’, // example identifier
                ssid: 'r894hvfnviurfincdejkencjcv' // example identifier
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
| params.api_key | Required | String |BritePool API Key provided by BritePool | "458frgde-djd7-3ert-gyhu-12fghy76dnmko" |
| params.url | Optional | String |BritePool API url | "https://sandbox-api.britepool.com/v1/britepool/id" |
| params.identifier | Required | String | Where identifier in the params object is the key name. At least one identifier is required. Available Identifiers `aaid` `dtid` `idfa` `ilid` `luid` `mmid` `msid` `mwid` `rida` `ssid` `hash` | `params.ssid` `params.aaid` |
| storage | Required | Object | The publisher must specify the local storage in which to store the results of the call to get the user ID. This can be either cookie or HTML5 storage. | |
| storage.type | Required | String | This is where the results of the user ID will be stored. The recommended method is `localStorage` by specifying `html5`. | `"html5"` |
| storage.name | Required | String | The name of the cookie or html5 local storage where the user ID will be stored. | `"britepoolid"` |
| storage.expires | Optional | Integer | How long (in days) the user ID information will be stored. | `365` |
| value | Optional | Object | Used only if the page has a separate mechanism for storing the BritePool ID. The value is an object containing the values to be sent to the adapters. In this scenario, no URL is called and nothing is added to local storage | `{"primaryBPID": "fd56yui-dvff-v5gbgtgg-4t55-45fggtgt5ttv"}` |

