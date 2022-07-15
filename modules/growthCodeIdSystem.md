## GrowthCode User ID Submodule

GrowthCode provides Id Enrichment for requests. 

## Building Prebid with GrowthCode Support

First, make sure to add the GrowthCode submodule to your Prebid.js package with:

```
gulp build --modules=growthCodeIdSystem,userId
```

The following configuration parameters are available:

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'growthCodeId',
      params: {
        pid: 'TEST01' // Set your Partner ID here for production (obtain from Growthcode)
      }
    }]
  }
});
```

| Param under userSync.userIds[] | Scope | Type   | Description | Example          |
|--------------------------------| --- |--------| --- |------------------|
| name                           | Required | String | The name of this module. | `"growthCodeId"` |
| params                         | Required | Object | Details of module params. |                  |
| params.pid                     | Required | String | This is the Customer ID value obtained via Intimate Merger. | `TEST01`         |
| params.url | Required | String | Custom URL for server | |
