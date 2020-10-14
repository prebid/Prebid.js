## Audigent Halo User ID Submodule

Audigent Halo ID Module. For assistance setting up your module please contact us at [prebid@audigent.com](prebid@audigent.com).

### Prebid Params

Individual params may be set for the Audigent Halo ID Submodule. At least one identifier must be set in the params.

```
pbjs.setConfig({
    usersync: {
        userIds: [{
            name: 'haloId',
            storage: {
                name: 'haloId',
                type: 'html5'
            }
        }]
    }
});
```
## Parameter Descriptions for the `usersync` Configuration Section
The below parameters apply only to the HaloID User ID Module integration.

| Param under usersync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID value for the HaloID module - `"haloId"` | `"haloId"` |
| storage | Required | Object | The publisher must specify the local storage in which to store the results of the call to get the user ID. This can be either cookie or HTML5 storage. | |
| storage.type | Required | String | This is where the results of the user ID will be stored. The recommended method is `localStorage` by specifying `html5`. | `"html5"` |
| storage.name | Required | String | The name of the cookie or html5 local storage where the user ID will be stored. | `"haloid"` |
| storage.expires | Optional | Integer | How long (in days) the user ID information will be stored. | `365` |
| value | Optional | Object | Used only if the page has a separate mechanism for storing the Halo ID. The value is an object containing the values to be sent to the adapters. In this scenario, no URL is called and nothing is added to local storage | `{"haloId": "eb33b0cb-8d35-4722-b9c0-1a31d4064888"}` |
