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
          pid: 'TEST01', // Set your Partner ID here for production (obtained from Growthcode)
          publisher_id: '_sharedID',
          publisher_id_storage: 'html5'
      }
    }]
  }
});
```

| Param under userSync.userIds[] | Scope    | Type   | Description | Example         |
|--------------------------------|----------|--------| --- |-----------------|
| name                           | Required | String | The name of this module. | `"growthCodeId"` |
| params                         | Required | Object | Details of module params. |                 |
| params.pid                     | Required | String | This is the Parter ID value obtained from GrowthCode | `"TEST01"`        |
| params.url | Optional | String | Custom URL for server | |
| params.publisher_id | Optional | String | Name if the variable that holds your publisher ID | `"_sharedID"` |
| params.publisher_id_storage | Optional | String | Publisher ID storage (cookie, html5) | `"html5"` |
