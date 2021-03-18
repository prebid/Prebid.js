## UID 2.0 User ID Submodule

UID 2.0 ID Module.

### Prebid Params

Individual params may be set for the UID 2.0 Submodule. At least one identifier must be set in the params.

```
pbjs.setConfig({
    usersync: {
        userIds: [{
            name: 'uid20',
            storage: {
                name: 'uid20id',
                type: 'html5'
            }
        }]
    }
});
```
## Parameter Descriptions for the `usersync` Configuration Section
The below parameters apply only to the UID 2.0 User ID Module integration.

| Param under usersync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID value for the UID20 module - `"uid20"` | `"uid20"` |
| storage | Required | Object | The publisher must specify the local storage in which to store the results of the call to get the user ID. This can be either cookie or HTML5 storage. | |
| storage.type | Required | String | This is where the results of the user ID will be stored. The recommended method is `localStorage` by specifying `html5`. | `"html5"` |
| storage.name | Required | String | The name of the cookie or html5 local storage where the user ID will be stored. | `"uid20id"` |
| storage.expires | Optional | Integer | How long (in days) the user ID information will be stored. | `365` |
| value | Optional | Object | Used only if the page has a separate mechanism for storing the Halo ID. The value is an object containing the values to be sent to the adapters. In this scenario, no URL is called and nothing is added to local storage | `{"uid20": { "id": "eb33b0cb-8d35-4722-b9c0-1a31d4064888"}}` |
