## Shared ID User ID Submodule

Shared ID User ID Module generates a UUID that can be utilized to improve user matching.This module enables timely synchronization which handles sharedId.org optout. This module does not require any registration.  

### Building Prebid with Shared Id Support
Your Prebid build must include the modules for both **userId** and **sharedId** submodule. Follow the build instructions for Prebid as
explained in the top level README.md file of the Prebid source tree.

ex: $ gulp build --modules=userId,sharedIdSystem

### Prebid Params

Individual params may be set for the Shared ID User ID Submodule. 
```
pbjs.setConfig({
    usersync: {
        userIds: [{
            name: 'sharedId',
            params: {
                      syncTime: 60 // in seconds, default is 24 hours
             },
            storage: {
                name: 'sharedid',
                type: 'cookie',
                expires: 28
            },
        }]
    }
});
```

### Parameter Descriptions for the `usersync` Configuration Section
The below parameters apply only to the Shared ID User ID Module integration.

| Params under usersync.userIds[]| Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID value for the Shared ID module - `"sharedId"` | `"sharedId"` |
| params | Optional | Object | Details for sharedId syncing. | |
| params.syncTime | Optional | Object | Configuration to define the frequency(in seconds) of id synchronization. By default id is synchronized every 24 hours | 60 |
| storage | Required | Object | The publisher must specify the local storage in which to store the results of the call to get the user ID. This can be either cookie or HTML5 storage. | |
| storage.type | Required | String | This is where the results of the user ID will be stored. The recommended method is `localStorage` by specifying `html5`. | `"html5"` |
| storage.name | Required | String | The name of the cookie or html5 local storage where the user ID will be stored. | `"sharedid"` |
| storage.expires | Optional | Integer | How long (in days) the user ID information will be stored. | `28` |
