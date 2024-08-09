## CPEx User ID Submodule

CPExID is provided by [Czech Publisher Exchange](https://www.cpex.cz/), or CPEx. It is a user ID for ad targeting by using first party cookie, or localStorage mechanism. Please contact CPEx before using this ID.

## Building Prebid with CPExID Support

First, make sure to add the cpexId to your Prebid.js package with:

```
gulp build --modules=cpexIdSystem
```

The following configuration parameters are available:

```javascript
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'cpexId'
        }]
    }
});
```

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | The name of this module. | `"cpexId"` |
