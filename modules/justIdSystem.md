## Just ID User ID Submodule

For assistance setting up your module please contact us at [prebid@justtag.com](prebid@justtag.com).

First, make sure to add the Just ID submodule to your Prebid.js package with:

```
gulp build --modules=userId,justIdSystem
```

### Prebid Params

Individual params may be set for the Just ID Submodule.

```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'justId',
            params: {
                url: 'https://id.nsaudience.pl/getId.js', // optional
                partner: 'pbjs-just-id-module'            // optional, may be required in some custom integrations with Justtag
            }
        }]
    }
});
```

## Parameter Descriptions for the `userSync` Configuration Section
The below parameters apply only to the Just ID integration.

| Param under usersync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID of the module - `'justId'` | `'justId'` |
| params | Optional | Object | Details for Just ID syncing. | |
| params.url | Optional | String | Our API Url | `'https://id.nsaudience.pl/getId.js'` |
| params.partner | Optional | String | This is the Justtag Partner Id which may be required in some custom integrations with Justtag | `'some-publisher'` |