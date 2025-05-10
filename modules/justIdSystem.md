## Just ID User ID Submodule

For assistance setting up your module please contact us at [prebid@justtag.com](prebid@justtag.com).

First, make sure to add the Just ID submodule to your Prebid.js package with:

```
gulp build --modules=userId,justIdSystem
```

### Modes

- **BASIC** - in this mode we rely on Justtag library that already exists on publisher page. Typicaly that library expose global variable called `__atm`

- **COMBINED** - Just ID generation process may differ between various cases depends on publishers. This mode combines our js library with prebid for ease of integration

### Disclosure

This module in `COMBINED` mode loads external JavaScript to generate optimal quality user ID. It is possible to retrieve user ID, without loading additional script by this module in `BASIC` mode.

### Just ID Example

ex. 1. Mode `COMBINED`

```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'justId',
            params: {
                mode: 'COMBINED',
                url: 'https://id.nsaudience.pl/getId.js', // required in COMBINED mode
                partner: 'pbjs-just-id-module'            // optional, may be required in some custom integrations with Justtag
            }
        }]
    }
});
```

ex. 2. Mode `BASIC`

```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'justId',
            params: {
                mode: 'BASIC',       // default
                atmVarName: '__atm'  // optional
            }
        }]
    }
});
```

### Prebid Params

Individual params may be set for the Just ID Submodule.

## Parameter Descriptions for the `userSync` Configuration Section
The below parameters apply only to the Just ID integration.

| Param under usersync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID of the module - `'justId'` | `'justId'` |
| params | Optional | Object | Details for Just ID syncing. | |
| params.mode | Optional | String | Mode in which the module works. Available Modes: `'COMBINED'`, `'BASIC'`(default)   | `'COMBINED'` |
| params.atmVarName | Optional | String | Name of global object property that point to Justtag ATM Library. Defaults to `'__atm'` | `'__atm'` |
| params.url | Optional | String | API Url, **required** in `COMBINED` mode | `'https://id.nsaudience.pl/getId.js'` |
| params.partner | Optional | String | This is the Justtag Partner Id which may be required in some custom integrations with Justtag | `'some-publisher'` |
