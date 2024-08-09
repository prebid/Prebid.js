## AudienceOne User ID Submodule

AudienceOne ID, provided by [D.A.Consortium Inc.](https://www.dac.co.jp/), is ID for ad targeting by using 1st party cookie.
Please contact D.A.Consortium Inc. before using this ID.

## Building Prebid with AudienceOne ID Support

First, make sure to add the AudienceOne ID submodule to your Prebid.js package with:

```
gulp build --modules=dacIdSystem
```

The following configuration parameters are available:

```javascript
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'dacId'
        }]
    }
});
```

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | The name of this module. | `"dacId"` |
