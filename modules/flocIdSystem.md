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
             }
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
| storage | Not Allowed | Object | Will ask browser for cohort everytime. Setting storage will fail id lookup ||
