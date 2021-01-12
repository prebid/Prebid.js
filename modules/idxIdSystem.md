## IDx User ID Submodule

For assistance setting up your module please contact us at [prebid@idx.lat](prebid@idx.lat).

### Prebid Params

Individual params may be set for the IDx Submodule.
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'idx',
        }]
    }
});
```
## Parameter Descriptions for the `userSync` Configuration Section
The below parameters apply only to the IDx integration.

| Param under usersync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | ID of the module - `"idx"` | `"idx"` |
