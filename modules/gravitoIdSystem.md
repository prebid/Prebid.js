## Gravito User ID Submodule

Gravito ID, provided by [Gravito Ltd.](https://gravito.net), is ID for ad targeting by using 1st party cookie.
Please contact Gravito Ltd. before using this ID.

## Building Prebid with Gravito ID Support

First, make sure to add the Gravito ID submodule to your Prebid.js package with:

```
gulp build --modules=gravitoIdSystem
```

The following configuration parameters are available:

```javascript
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'gravitompId'
        }]
    }
});
```

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | The name of this module. | `"gravitompId"` |
