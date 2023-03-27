## CzechAdId User ID Submodule

Czech Ad ID is a joint project of publishers of the [CPEx alliance](https://www.cpex.cz/) and [Seznam.cz](https://www.seznam.cz). It is a deterministic user ID that offers cross-domain and cross-device identification. For more information see [czechadid.cz](https://www.czechadid.cz)).

## Building Prebid with CzechAdId Support

First, make sure to add the czechAdId to your Prebid.js package with:

```
gulp build --modules=czechAdIdSystem
```

The following configuration parameters are available:

```javascript
pbjs.setConfig({
    userSync: {
        userIds: [{
            name: 'czechAdId'
        }]
    }
});
```

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | The name of this module. | `"czechAdId"` |
