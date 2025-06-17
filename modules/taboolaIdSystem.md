## Taboola User ID Submodule

For assistance setting up your module please contact us at [ps-team@taboola.com].

### Prebid Params

Individual params may be set for the Taboola Submodule.
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'taboolaId',
        }]
    }
});
```
## Parameter Descriptions for the `userSync` Configuration Section
The below parameters apply only to the Taboola integration.

| Param under usersync.userIds[] | Scope | Type | Description                    | Example     |
| --- | --- | --- |--------------------------------|-------------|
| name | Required | String | ID of the module - `"taboolaId"` | `"taboola"` |

 ## How to Use It
 ────────────────────────────────────────────────────────
 1. Make sure it’s included when you build Prebid:
   gulp build --modules=userId,taboolaIdSystem,[otherModules]
 2. In your Prebid config, enable the Taboola ID submodule:
```
   pbjs.setConfig({
        userSync: {
          userIds: [
            {
              name: 'taboolaId',
              storage: {                    //Optionally specify where to store the ID, e.g. cookies or localStorage
                 name: 'taboolaId',
                 type: 'html5', // or 'cookie' or 'html5&cookie'
                 expires: 365 // days
               }
            }
         ]
        }
  });
```
