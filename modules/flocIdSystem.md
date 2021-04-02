## FloC ID User ID Submodule

### Building Prebid with Floc Id Support
Your Prebid build must include the modules for both **userId** and **flocIdSystem** submodule. Follow the build instructions for Prebid as
explained in the top level README.md file of the Prebid source tree.

ex: $ gulp build --modules=userId,flocIdSystem

### Prebid Params

Individual params may be set for the FloC ID User ID Submodule. 
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'originFloc',
            params: {
                      token: "sharedid's token by default"
             },
            storage: {
                name: 'flocId',
                type: 'cookie',
                expires: 28
            },
        }]
    }
});
```

### Parameter Descriptions for the `userSync` Configuration Section
The below parameters apply only to the FloC ID User ID Module integration.

| Params under usersync.userIds[]| Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID value for the Floc ID module - `"flocId"` | `"flocId"` |
| params | Optional | Object | Details for flocId syncing. | |
| params.token | Optional | Object | SharedId's token by default | 60 |
| storage | Required | Object | The publisher must specify the local storage in which to store the results of the call to get the user ID. This can be either cookie or HTML5 storage. | |
| storage.type | Required | String | This is where the results of the user ID will be stored. The recommended method is `localStorage` by specifying `html5`. | `"html5"` |
| storage.name | Required | String | The name of the cookie or html5 local storage where the user ID will be stored. | `"flocid"` |
| storage.expires | Optional | Integer | How long (in days) the user ID information will be stored. | `28` |
