# ID5 Universal ID

The ID5 Universal ID is a shared, neutral identifier that publishers and ad tech platforms can use to recognise users even in environments where 3rd party cookies are not available. The ID5 Universal ID is designed to respect users' privacy choices and publishers’ preferences throughout the advertising value chain. For more information about the ID5 Universal ID and detailed integration docs, please visit [our documentation](https://console.id5.io/docs/public/prebid). We also recommend that you sign up for our [release notes](https://id5.io/universal-id/release-notes) to stay up-to-date with any changes to the implementation of the ID5 Universal ID in Prebid.

## ID5 Universal ID Registration

The ID5 Universal ID is free to use, but requires a simple registration with ID5. Please visit [id5.io/universal-id](https://id5.io/universal-id) to sign up and request your ID5 Partner Number to get started.

The ID5 privacy policy is at [https://www.id5.io/platform-privacy-policy](https://www.id5.io/platform-privacy-policy).

## ID5 Universal ID Configuration

First, make sure to add the ID5 submodule to your Prebid.js package with:

```
gulp build --modules=id5IdSystem,userId
```

The following configuration parameters are available:

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: "id5Id",
      params: {
        partner: 173,            // change to the Partner Number you received from ID5
        pd: "MT1iNTBjY..."       // optional, see table below for a link to how to generate this
      },
      storage: {
        type: "html5",           // "html5" is the required storage type
        name: "id5id",           // "id5id" is the required storage name
        expires: 90,             // storage lasts for 90 days
        refreshInSeconds: 8*3600 // refresh ID every 8 hours to ensure it's fresh
      }
    }],
    auctionDelay: 50             // 50ms maximum auction delay, applies to all userId modules
  }
});
```

| Param under userSync.userIds[] | Scope | Type | Description | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | The name of this module: `"id5Id"` | `"id5Id"` |
| params | Required | Object | Details for the ID5 Universal ID. | |
| params.partner | Required | Number | This is the ID5 Partner Number obtained from registering with ID5. | `173` |
| params.pd | Optional | String | Publisher-supplied data used for linking ID5 IDs across domains. See [our documentation](https://wiki.id5.io/x/BIAZ) for details on generating the string. Omit the parameter or leave as an empty string if no data to supply | `"MT1iNTBjY..."` |
| storage | Required | Object | Storage settings for how the User ID module will cache the ID5 ID locally | |
| storage.type | Required | String | This is where the results of the user ID will be stored. ID5 **requires** `"html5"`. | `"html5"` |
| storage.name | Required | String | The name of the local storage where the user ID will be stored. ID5 **requires** `"id5id"`. | `"id5id"` |
| storage.expires | Optional | Integer | How long (in days) the user ID information will be stored. ID5 recommends `90`. | `90` |
| storage.refreshInSeconds | Optional | Integer | How many seconds until the ID5 ID will be refreshed. ID5 strongly recommends 8 hours between refreshes | `8*3600` |

**ATTENTION:** As of Prebid.js v4.14.0, ID5 requires `storage.type` to be `"html5"` and `storage.name` to be `"id5id"`. Using other values will display a warning today, but in an upcoming release, it will prevent the ID5 module from loading. This change is to ensure the ID5 module in Prebid.js interoperates properly with the [ID5 API](https://github.com/id5io/id5-api.js) and to reduce the size of publishers' first-party cookies that are sent to their web servers. If you have any questions, please reach out to us at [prebid@id5.io](mailto:prebid@id5.io).