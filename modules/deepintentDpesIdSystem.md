# Deepintent DPES ID

The Deepintent DPES ID or Healthcare Identity is a shared, neutral identifier that publishers and ad tech platforms can use to recognise users even in environments where 3rd party cookies are not available. The Deepintent DPES ID is designed to respect users' privacy choices and publishers’ preferences throughout the advertising value chain. 

## Deepintent DPES ID Registration

The Deepintent DPES ID is free to use, but requires a simple registration with Deepintent. Please contact your sales rep to get started


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
      params: {
        siteId: 173,            // change to the siteId number to the one you recieved from Deepintent.
        identityKey: "hashedEmail" // HashedEmail or HashedNPI based on type of your integration
      },
      storage: {
        type: 'cookie',           // "html5" is the required storage type option is "html5"
        name: '_di',            // change to the cookie name you wish to read from, optional if storage type is html5
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
| params | Required | Object | Details for the Deepinent DPES ID. | |
| params.siteId | Required | Number | This is the Deepintent site id obtained from registering with deepintent. | `10023` |
| params.identityKey | Required | String | This is identity type which healthcare identity will store by using healthcare identity module by deepintent it will be either "hashedEmail" or "hashedNPI" | `hashedEmai` |
| storage | Required | Object | Storage settings for how the User Id module will cache the Deepintent ID locally | |
| storage.type | Required | String | This is where the results of the user ID will be stored. Deepintent`"html5"` or `"cookie"`. | `"html5"` |
| storage.name | Optional | String | The name of the local storage where the user ID will be stored. Deepintent **required** for storage type `"cookie"`. | `"_di"` |
| storage.expires | Optional | Integer | How long (in days) the user ID information will be stored. Deepintent recommends `90`. | `90` |