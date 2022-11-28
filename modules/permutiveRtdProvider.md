## Prebid Config for Permutive RTD Module

This module reads cohorts from Permutive and attaches them as targeting keys to bid requests.

### _Permutive Real-time Data Submodule_

#### Usage
Compile the Permutive RTD module into your Prebid build:

```
gulp build --modules=rtdModule,permutiveRtdProvider
```

> Note that the global RTD module, `rtdModule`, is a prerequisite of the Permutive RTD module.

You then need to enable the Permutive RTD in your Prebid configuration, using the below format:

```javascript
pbjs.setConfig({
  ...,
  realTimeData: {
    auctionDelay: 50, // optional auction delay
    dataProviders: [{
      name: 'permutive',
      waitForIt: true, // should be true if there's an `auctionDelay`
      params: {
        acBidders: ['appnexus']
      }
    }]
  },
  ...
})
```

#### Parameters

The parameters below provide configurability for general behaviours of the RTD submodule,
as well as enabling settings for specific use cases mentioned above (e.g. acbidders).

| Name                   | Type     | Description                                                                                   | Default |
|------------------------|----------|-----------------------------------------------------------------------------------------------|---------|
| name                   | String   | This should always be `permutive`                                                             | -       |
| waitForIt              | Boolean  | Should be `true` if there's an `auctionDelay` defined (optional)                              | `false` |
| params                 | Object   |                                                                                               | -       |
| params.acBidders       | String[] | An array of bidders which should receive AC cohorts.                                          | `[]`    |
| params.maxSegs         | Integer  | Maximum number of cohorts to be included in either the `permutive` or `p_standard` key-value. | `500`   |
| params.transformations | Object[] | An array of configurations for ORTB2 user data transformations                                |         |
| params.overwrites      | Object   | An object specifying functions for custom targeting logic for bidders.                        | -       |

##### The `transformations` parameter

This array contains configurations for transformations we'll apply to the Permutive object in the ORTB2 `user.data` array. The results of these transformations will be appended to the `user.data` array that's attached to ORTB2 bid requests.

###### Supported transformations

| Name           | ID  | Config structure                                  | Description                                                                          |
|----------------|-----|---------------------------------------------------|--------------------------------------------------------------------------------------|
| IAB taxonomies | iab | { segtax: number, iabIds: Object<number, number>} | Transform segment IDs from Permutive to IAB (note: alpha version, subject to change) |

##### The `overwrites` parameter

The keys for this object should match a bidder (e.g. `rubicon`), which then can define a function to overwrite the customer targeting logic.

```javascript
{
  params: {
    overwrites: {
      rubicon: function customTargeting(bid, data, acEnabled, utils, defaultFn) {
        if (defaultFn) {
          bid = defaultFn(bid, data, acEnabled)
        }
        if (data.gam && data.gam.length) {
          utils.deepSetValue(bid, 'params.visitor.permutive', data.gam)
        }
      } 
    }
  }
}
```

###### `customTargeting` function parameters

| Name         | Description                                                                    |
|--------------|--------------------------------------------------------------------------------|
| `bid`        | The bid request object.                                                        |
| `data`       | Permutive's targeting data read from localStorage.                             |
| `acEnabled`  | Boolean stating whether Audience Connect is enabled via `acBidders`.           |
| `utils`      | An object of helpful utilities. `(deepSetValue, deepAccess, isFn, mergeDeep)`. |
| `defaultFn`  | The default targeting function.                                                |




#### Context

Permutive is not listed as a TCF vendor as all data collection is on behalf of the publisher and based on consent the publisher has received from the user.
Rather than through the TCF framework, this consent is provided to Permutive when the user gives the relevant permissions on the publisher website which allow the Permutive SDK to run.
This means that if GDPR enforcement is configured _and_ the user consent isn’t given for Permutive to fire, no cohorts will populate.
As Prebid utilizes TCF vendor consent, for the Permutive RTD module to load, Permutive needs to be labeled within the Vendor Exceptions

#### Instructions

1. Publisher enables GDPR rules within Prebid.
2. Label Permutive as an exception, as shown below.
```javascript
[
  {
    purpose: 'storage',
    enforcePurpose: true,
    enforceVendor: true,
    vendorExceptions: ["permutive"]
  },
  {
    purpose: 'basicAds',
    enforcePurpose: true,
    enforceVendor: true,
    vendorExceptions: []
  }
]
```

Before making any updates to this configuration, please ensure that this approach aligns with internal policies and current regulations regarding consent.

## Cohort Activation with Permutive RTD Module

### _Enabling Standard Cohorts_

**Note**: Publishers must be enabled on the above Permutive RTD Submodule to enable Standard Cohorts.

The acbidders config in the Permutive RTD module allows publishers to determine which demand partners (SSPs) will receive standard cohorts via the <u>user.data</u> ortb2 object. Cohorts will be sent in the `p_standard` key-value.

The Permutive RTD module sets standard cohort IDs as bidder-specific ortb2.user.data first-party data, following the Prebid ortb2 convention.

There are **two** ways to assign which demand partner bidders (e.g. SSPs) will receive Standard Cohort information via the Audience Connector (acbidders) config:

#### Option 1 - Automated

New demand partner bidders may be added to the acbidders config directly within the Permutive Platform.

**Permutive can do this on your behalf**. Simply contact your Permutive CSM with strategicpartnershipops@permutive.com on cc,
indicating which bidders you would like added.

Or, a publisher may do this themselves within the UI using the below instructions.

##### Create Integration

In order to update acbidders via the Permutive dashboard,
it is necessary to first enable the prebid integration in the integrations page (settings).

**Note on Revenue Insights:** The prebid integration includes a feature for revenue insights,
which is not required for the purpose of updating acbidders config.
Please see [this document](https://support.permutive.com/hc/en-us/articles/360019044079-Revenue-Insights) for more information about revenue insights.

##### Update acbidders

The input for the “Data Provider config” is currently a multi-input free text.
A valid “bidder code” needs to be entered in order to enable Standard Cohorts to be passed to the desired partner.
The [prebid Bidders page](https://docs.prebid.org/dev-docs/bidders.html) contains instructions and a link to a list of possible bidder codes.

Acbidders can be added or removed from the list using this feature, however, this will not impact any acbidders that have been applied using the manual method below.

#### Option 2 - Manual

As a secondary option, new demand partner bidders may be added manually.

To do so, a Publisher may define which bidders should receive Standard Cohorts by
including the _bidder code_ of any bidder in the `acBidders` array.

**Note:** If a Publisher ever needs to remove a manually-added bidder, the bidder will also need to be removed manually.

### _Enabling Custom Cohort IDs for Targeting_

Separately from Standard Cohorts - The Permutive RTD module also supports passing any of the **custom** cohorts created in the dashboard to some SSP partners for targeting
e.g. setting up publisher deals. For these activations, cohort IDs are set in bidder-specific locations per ad unit (custom parameters).

Currently, bidders with known support for custom cohort targeting are:

- Xandr
- Magnite

When enabling the respective Activation for a cohort in Permutive, this module will automatically attach that cohort ID to the bid request.
There is no need to enable individual bidders in the module configuration, it will automatically reflect which SSP integrations you have enabled in your Permutive dashboard.
Permutive cohorts will be sent in the permutive key-value.
