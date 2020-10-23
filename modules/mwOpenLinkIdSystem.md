## MediaWallah openLink User ID Submodule

OpenLink ID User ID Module generates a UUID that can be utilized to improve user matching. This module enables timely synchronization which handles MediaWallah optout. You must have a pre-existing relationship with MediaWallah prior to integrating.  

### Building Prebid with openLink Id Support
Your Prebid build must include the modules for both **userId** and **mwOpenLinkId** submodule. Follow the build instructions for Prebid as
explained in the top level README.md file of the Prebid source tree.

ex: $ gulp build --modules=userId,mwOpenLinkIdSystem

##$ MediaWallah openLink ID Example Configuration

When the module is included, it's automatically enabled and saves an id to both cookie and local storage with an expiration time of 1 year.  

### Prebid Params

Individual params may be set for the BritePool User ID Submodule. At least one identifier must be set in the params.
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'mwolid',
            storage: {
                name: 'mwolid',
                type: 'cookie',
                expires: 3
            },
            params: {
                account_id: 0000,
                partner-id: 0000,
                uid: '12345xyz'

            }
        }]
    }
});

### Parameter Descriptions for the `usersync` Configuration Section
The below parameters apply only to the MediaWallah OpenLink ID User ID Module integration.

| Params under usersync.userIds[]| Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID value for the Shared ID module - `"sharedId"` | `"sharedId"` |
| params | Required | Object | Details for mwOLID syncing. | |
| params.account_id | Required | String | The MediaWallah assigned Account Id | `1000` |
| params.partner_id | Required | String | The MediaWallah assign partner Id | `params.ssid` `params.aaid` |
| params.uid | Optional | String | Your unique Id for the user or browser. Used for matching| `u-123xyz` |
| storage | Required | Object | The publisher must specify the local storage in which to store the results of the call to get the user ID. This can be either cookie or HTML5 storage. | |
| storage.type | Required | String | This is where the results of the user ID will be stored. The recommended method is `localStorage` by specifying `html5`. | `"html5"` |
| storage.name | Required | String | The name of the cookie or html5 local storage where the user ID will be stored. | `"sharedid"` |
| storage.expires | Optional | Integer | How long (in years) the user ID information will be stored. | `1` |