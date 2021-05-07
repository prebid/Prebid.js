## UID 2.0 User ID Submodule

UID 2.0 ID Module.

### Prebid Params

Individual params may be set for the UID 2.0 Submodule. At least one identifier must be set in the params.

```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'uid2'
        }]
    }
});
```
## Parameter Descriptions for the `usersync` Configuration Section
The below parameters apply only to the UID 2.0 User ID Module integration.

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID value for the UID20 module - `"uid2"` | `"uid2"` |
| value | Optional | Object | Used only if the page has a separate mechanism for storing the UID 2.0 ID. The value is an object containing the values to be sent to the adapters. In this scenario, no URL is called and nothing is added to local storage | `{"uid2": { "id": "eb33b0cb-8d35-4722-b9c0-1a31d4064888"}}` |
