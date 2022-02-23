## Audigent Hadron User ID Submodule

Audigent Hadron ID Module. For assistance setting up your module please contact us at [prebid@audigent.com](prebid@audigent.com).

### Prebid Params

Individual params may be set for the Audigent Hadron ID Submodule. At least one identifier must be set in the params.

```
pbjs.setConfig({
    usersync: {
        userIds: [{
            name: 'hadronId',
            storage: {
                name: 'hadronId',
                type: 'html5'
            }
        }]
    }
});
```
## Parameter Descriptions for the `usersync` Configuration Section
The below parameters apply only to the HadronID User ID Module integration.

| Param under usersync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID value for the HadronID module - `"hadronId"` | `"hadronId"` |
| storage | Required | Object | The publisher must specify the local storage in which to store the results of the call to get the user ID. This can be either cookie or HTML5 storage. | |
| storage.type | Required | String | This is where the results of the user ID will be stored. The recommended method is `localStorage` by specifying `html5`. | `"html5"` |
| storage.name | Required | String | The name of the cookie or html5 local storage where the user ID will be stored. | `"hadronid"` |
| storage.expires | Optional | Integer | How long (in days) the user ID information will be stored. | `365` |
| value | Optional | Object | Used only if the page has a separate mechanism for storing the Hadron ID. The value is an object containing the values to be sent to the adapters. In this scenario, no URL is called and nothing is added to local storage | `{"hadronId": "eb33b0cb-8d35-4722-b9c0-1a31d4064888"}` |
| params | Optional | Object | Used to store params for the id system |
| params.url | Optional | String | Set an alternate GET url for HadronId with this parameter |
| params.urlArg | Optional | Object | Optional url parameter for params.url |
