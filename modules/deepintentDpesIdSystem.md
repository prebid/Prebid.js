# Deepintent DPES ID

The Deepintent Id  is a shared, healthcare identifier which helps publisher in absence of the 3rd Party cookie matching. This lets publishers set and bid with healthcare identity . Deepintent lets users protect their privacy through advertising value chain, where Healthcare identity when setting the identity takes in consideration of users choices, as well as when passing identity on the cookie itself privacy consent strings are checked. The healthcare identity when set is not stored on Deepintent's servers but is stored on users browsers itself. User can still opt out of the ads by https://option.deepintent.com/adchoices. 

## Deepintent DPES ID Registration

The Deepintent DPES ID is free to use, but requires a simple registration with Deepintent. Please reach to prebid@deepintent.com to get started.
Once publisher registers with deepintents platform for healthcare identity Deepintent provides the Tag code to be placed on the page, this tag code works to capture and store information as per publishers and users agreement. DPES User ID module uses this stored id and passes it on the deepintent prebid adapter.


## Deepintent DPES ID Configuration

First, make sure to add the Deepintent submodule to your Prebid.js package with:

```
gulp build --modules=deepintentDpesIdSystem,userId
```

The following configuration parameters are available:

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'deepintentId',
      storage: {
        type: 'cookie',          
        name: '_dpes_id',        
        expires: 90             // storage lasts for 90 days, optional if storage type is html5
      }
    }],
    auctionDelay: 50             // 50ms maximum auction delay, applies to all userId modules
  }
});
```

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | The name of this module: `"deepintentId"` | `"deepintentId"` |
| storage | Required | Object | Storage settings for how the User Id module will cache the Deepintent ID locally | |
| storage.type | Required | String | This is where the results of the user ID will be stored. Deepintent`"html5"` or `"cookie"`. | `"html5"` |
| storage.name | Required | String | The name of the local storage where the user ID will be stored. | `"_dpes_id"` |
| storage.expires | Optional | Integer | How long (in days) the user ID information will be stored. Deepintent recommends `90`. | `90` |