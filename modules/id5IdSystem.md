# ID5 ID

The ID5 ID is a shared, neutral identifier that publishers and ad tech platforms can use to recognise users even in environments where 3rd party cookies are not available. The ID5 ID is designed to respect users' privacy choices and publishers’ preferences throughout the advertising value chain. For more information about the ID5 ID and detailed integration docs, please visit [our documentation](https://wiki.id5.io/en/identitycloud/retrieve-id5-ids/prebid-user-id-module/id5-prebid-user-id-module).

## ID5 ID Registration

The ID5 ID is free to use, but requires a simple registration with ID5. Please visit [our website](https://id5.io/solutions/#publishers) to sign up and request your ID5 Partner Number to get started.

The ID5 privacy policy is at [https://id5.io/platform-privacy-policy](https://id5.io/platform-privacy-policy).

## ID5 ID Configuration

First, make sure to add the ID5 submodule to your Prebid.js package with:

```
gulp build --modules=id5IdSystem,userId
```

The following configuration parameters are available:

```javascript
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'id5Id',
      params: {
        partner: 173,            // change to the Partner Number you received from ID5
        externalModuleUrl: "https://cdn.id5-sync.com/api/1.0/id5PrebidModule.js" // optional but recommended
        pd: 'MT1iNTBjY...',      // optional, see table below for a link to how to generate this
        abTesting: {             // optional
          enabled: true,         // false by default
          controlGroupPct: 0.1   // valid values are 0.0 - 1.0 (inclusive)
        },
        disableExtensions: false // optional
      },
      storage: {
        type: 'html5',           // "html5" is the required storage type
        name: 'id5id',           // "id5id" is the required storage name
        expires: 90,             // storage lasts for 90 days
        refreshInSeconds: 8*3600 // refresh ID every 8 hours to ensure it's fresh
      }
    }],
    auctionDelay: 50             // 50ms maximum auction delay, applies to all userId modules
  }
});
```

| Param under userSync.userIds[] | Scope | Type | Description                                                                                                                                                                                                                                                                    | Example |
| --- | --- | --- | --- | --- |
| name | Required | String | The name of this module: `"id5Id"`                                                                                                                                                                                                                                             | `"id5Id"` |
| params | Required | Object | Details for the ID5 ID.                                                                                                                                                                                                                                                        | |
| params.partner | Required | Number | This is the ID5 Partner Number obtained from registering with ID5.                                                                                                                                                                                                             | `173` |
| params.externalModuleUrl | Optional | String | The URL for the id5-prebid external module. It is recommended to use the latest version at the URL in the example. Source code available [here](https://github.com/id5io/id5-api.js/blob/master/src/id5PrebidModule.js). | https://cdn.id5-sync.com/api/1.0/id5PrebidModule.js
| params.pd | Optional | String | Partner-supplied data used for linking ID5 IDs across domains. See [our documentation](https://wiki.id5.io/en/identitycloud/retrieve-id5-ids/passing-partner-data-to-id5) for details on generating the string. Omit the parameter or leave as an empty string if no data to supply     | `"MT1iNTBjY..."` |
| params.provider | Optional | String | An identifier provided by ID5 to technology partners who manage Prebid setups on behalf of publishers. Reach out to [ID5](mailto:prebid@id5.io) if you have questions about this parameter                                                                                     | `pubmatic-identity-hub` |
| params.abTesting | Optional | Object | Allows publishers to easily run an A/B Test. If enabled and the user is in the Control Group, the ID5 ID will NOT be exposed to bid adapters for that request                                                                                                                  | Disabled by default |
| params.abTesting.enabled | Optional | Boolean | Set this to `true` to turn on this feature                                                                                                                                                                                                                                     | `true` or `false` |
| params.abTesting.controlGroupPct | Optional | Number | Must be a number between `0.0` and `1.0` (inclusive) and is used to determine the percentage of requests that fall into the control group (and thus not exposing the ID5 ID). For example, a value of `0.20` will result in 20% of requests without an ID5 ID and 80% with an ID. | `0.1` |
| params.disableExtensions | Optional | Boolean | Set this to `true` to force turn off extensions call. Default `false`                                                                                                                                                                                                          | `true` or `false` |
| storage | Required | Object | Storage settings for how the User ID module will cache the ID5 ID locally                                                                                                                                                                                                      | |
| storage.type | Required | String | This is where the results of the user ID will be stored. ID5 **requires** `"html5"`.                                                                                                                                                                                           | `"html5"` |
| storage.name | Required | String | The name of the local storage where the user ID will be stored. ID5 **requires** `"id5id"`.                                                                                                                                                                                    | `"id5id"` |
| storage.expires | Optional | Integer | How long (in days) the user ID information will be stored. ID5 recommends `90`.                                                                                                                                                                                                | `90` |
| storage.refreshInSeconds | Optional | Integer | How many seconds until the ID5 ID will be refreshed. ID5 strongly recommends 8 hours between refreshes                                                                                                                                                                         | `8*3600` |

**ATTENTION:** As of Prebid.js v4.14.0, ID5 requires `storage.type` to be `"html5"` and `storage.name` to be `"id5id"`. Using other values will display a warning today, but in an upcoming release, it will prevent the ID5 module from loading. This change is to ensure the ID5 module in Prebid.js interoperates properly with the [ID5 API](https://github.com/id5io/id5-api.js) and to reduce the size of publishers' first-party cookies that are sent to their web servers. If you have any questions, please reach out to us at [prebid@id5.io](mailto:prebid@id5.io).

### A Note on A/B Testing

Publishers may want to test the value of the ID5 ID with their downstream partners. While there are various ways to do this, A/B testing is a standard approach. Instead of publishers manually enabling or disabling the ID5 User ID Module based on their control group settings (which leads to fewer calls to ID5, reducing our ability to recognize the user), we have baked this in to our module directly.

To turn on A/B Testing, simply edit the configuration (see above table) to enable it and set what percentage of users you would like to set for the control group. The control group is the set of user where an ID5 ID will not be exposed in to bid adapters or in the various user id functions available on the `pbjs` global. An additional value of `ext.abTestingControlGroup` will be set to `true` or `false` that can be used to inform reporting systems that the user was in the control group or not. It's important to note that the control group is user based, and not request based. In other words, from one page view to another, a user will always be in or out of the control group.

### A Note on Using Multiple Wrappers
If you or your monetization partners are deploying multiple Prebid wrappers on your websites, you should make sure you add the ID5 ID User ID module to *every* wrapper. Only the bidders configured in the Prebid wrapper where the ID5 ID User ID module is installed and configured will be able to pick up the ID5 ID. Bidders from other Prebid instances will not be able to pick up the ID5 ID.
