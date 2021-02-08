## MediaWallah openLink User ID Submodule

OpenLink ID User ID Module generates a UUID that can be utilized to improve user matching. This module enables timely synchronization which handles MediaWallah optout. You must have a pre-existing relationship with MediaWallah prior to integrating.  

### Building Prebid with openLink Id Support
Your Prebid build must include the modules for both **userId** and **mwOpenLinkId** submodule. Follow the build instructions for Prebid as
explained in the top level README.md file of the Prebid source tree.

ex: $ gulp build --modules=userId,mwOpenLinkIdSystem

##$ MediaWallah openLink ID Example Configuration

When the module is included, it's automatically enabled and saves an id to both cookie and local storage with an expiration time of 1 year.  

### Prebid Params

Individual params may be set for the MediaWallah openLink User ID Submodule. At least one identifier must be set in the params.
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'mwOpenLinkId',
            params: {
                accountId: 0000,
                partnerId: 0000,
                uid: '12345xyz'
            }
        }]
    }
});

### Parameter Descriptions for the `usersync` Configuration Section
The below parameters apply only to the MediaWallah OpenLink ID User ID Module integration.

| Params under usersync.userIds[]| Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| params | Required | Object | Details for mwOLID syncing. | |
| params.accountId | Required | String | The MediaWallah assigned Account Id | `1000` |
| params.partnerId | Required | String | The MediaWallah assign partner Id | `1001` |
| params.uid | Optional | String | Your unique Id for the user or browser. Used for matching| `u-123xyz` |