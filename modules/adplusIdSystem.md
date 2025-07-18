## AdPlus User ID Submodule

For assistance setting up your module please contact us at adplusdestek@turkcell.com.tr.

### Prebid Params

Individual params may be set for the Adplus ID Submodule.
```
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'adplusId',
        }]
    }
});
```
## Parameter Descriptions for the `userSync` Configuration Section
The below parameters apply only to the AdPlus ID integration.

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | The name of this module. | `"adplusId"` |
