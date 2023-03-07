## AudienceOne User ID Submodule

AudienceOne ID, provided by [D.A.Consortium Inc.](https://www.dac.co.jp/), is ID for ad targeting by using 1st party cookie.
Please visit [https://solutions.dac.co.jp/audienceone](https://solutions.dac.co.jp/audienceone) and request your Owner ID to get started.

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
            name: 'dacId',
            params: {
                'oid': '55h67qm4ck37vyz5'
            }
        }]
    }
});
```

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | The name of this module. | `"dacId"` |
| params | Required | Object | Details of module params. | |
| params.oid | Required | String | This is the Owner ID value obtained via D.A.Consortium Inc. | `"55h67qm4ck37vyz5"` |