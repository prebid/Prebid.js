## Navegg User ID Submodule

For assistance setting up your module please contact us at [prebid@navegg.com](prebid@navegg.com).

### Prebid Params

Individual params may be set for the IDx Submodule.
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'naveggId',
        }]
    }
});
```
## Parameter Descriptions for the `userSync` Configuration Section
The below parameters apply only to the naveggID integration.

| Param under usersync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID of the module - `"naveggId"` | `"naveggId"` |
