## Intimate Merger User ID Submodule

IM-UID is a universal identifier provided by Intimate Merger.
The integration of [IM-UID](https://intimatemerger.com/r/uid) into Prebid.js consists of this module.

## Building Prebid with IM-UID Support

First, make sure to add the Intimate Merger submodule to your Prebid.js package with:

```
gulp build --modules=imuIdSystem,userId
```

The following configuration parameters are available:

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'imuid',
      params: {
        cid: 5126 // Set your Intimate Merger Customer ID here for production
      }
    }]
  }
});
```

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | The name of this module. | `"imuid"` |
| params | Required | Object | Details of module params. | |
| params.cid | Required | Number | This is the Customer ID value obtained via Intimate Merger. | `5126` |
| params.url | Optional | String | Use this to change the default endpoint URL. | `"https://example.com/some/api"` |
