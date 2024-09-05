## Prebid Config for Permutive RTD Module

This module reads cohorts from Permutive and attaches them as targeting keys to bid requests.

### _Permutive Real-time Data Submodule_

#### Usage
Compile the Permutive RTD module into your Prebid build:

```
gulp build --modules=rtdModule,permutiveRtdProvider
```

> Note that the global RTD module, `rtdModule`, is a prerequisite of the Permutive RTD module.

You then need to enable the Permutive RTD in your Prebid configuration. Below is an example of the format:

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

## Parameters

{: .table .table-bordered .table-striped }
| Name                   | Type                 | Description                                                                                   | Default            |
| ---------------------- | -------------------- | --------------------------------------------------------------------------------------------- | ------------------ |
| name                   | String               | This should always be `permutive`                                                             | -                  |
| waitForIt              | Boolean              | Should be `true` if there's an `auctionDelay` defined (optional)                              | `false`            |
| params                 | Object               |                                                                                               | -                  |
| params.acBidders       | String[]             | An array of bidder codes to share cohorts with in certain versions of Prebid, see below       | `[]`               |
| params.maxSegs         | Integer              | Maximum number of cohorts to be included in either the `permutive` or `p_standard` key-value. | `500`              |

#### Context

Permutive is not listed as a TCF vendor as all data collection is on behalf of the publisher and based on consent the publisher has received from the user.
Rather than through the TCF framework, this consent is provided to Permutive when the user gives the relevant permissions on the publisher website which allow the Permutive SDK to run.
This means that if GDPR enforcement is configured _and_ the user consent isn’t given for Permutive to fire, no cohorts will populate.
As Prebid utilizes TCF vendor consent, for the Permutive RTD module to load, Permutive needs to be labeled within the Vendor Exceptions

#### Instructions

1. Publisher enables rules within Prebid GDPR module
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

**Note**: Publishers must be enabled on the above Permutive RTD Submodule to enable Standard Cohorts.

### _Enabling Publisher Cohorts_

#### Standard Cohorts

The Permutive RTD module sets Standard Cohort IDs as bidder-specific ortb2.user.data first-party data, following the Prebid ortb2 convention. Cohorts will be sent in the `p_standard` key-value.

For Prebid versions below 7.29.0, populate the acbidders config in the Permutive RTD with an array of bidder codes with whom you wish to share Standard Cohorts with. You also need to permission the bidders by communicating the bidder list to the Permutive team at strategicpartnershipops@permutive.com.

For Prebid versions 7.29.0 and above, do not populate bidder codes in acbidders for the purpose of sharing Standard Cohorts (Note: there may be other business needs that require you to populate acbidders for Prebid versions 7.29.0+, see Advertiser Cohorts below). To share Standard Cohorts with bidders in Prebid versions 7.29.0 and above, communicate the bidder list to the Permutive team at strategicpartnershipops@permutive.com.

#### _Bidder Specific Requirements for Standard Cohorts_
For PubMatic or OpenX: Please ensure you are using Prebid.js 7.13 (or later)
For Xandr: Please ensure you are using Prebid.js 7.29 (or later)
For Equativ: Please ensure you are using Prebid.js 7.26 (or later)

#### Custom Cohorts

The Permutive RTD module also supports passing any of the **Custom** Cohorts created in the dashboard to some SSP partners for targeting
e.g. setting up publisher deals. For these activations, cohort IDs are set in bidder-specific locations per ad unit (custom parameters).

Currently, bidders with known support for custom cohort targeting are:

- Xandr
- Magnite

When enabling the respective Activation for a cohort in Permutive, this module will automatically attach that cohort ID to the bid request.
There is no need to enable individual bidders in the module configuration, it will automatically reflect which SSP integrations you have enabled in your Permutive dashboard.
Permutive cohorts will be sent in the permutive key-value.


### _Enabling Advertiser Cohorts_

If you are connecting to an Advertiser seat within Permutive to share Advertiser Cohorts,  populate the acbidders config in the Permutive RTD with an array of bidder codes with whom you wish to share Advertiser Cohorts with.

### _Managing acbidders_

If your business needs require you to populate acbidders with bidder codes based on the criteria above, there are **two** ways to manage it.

#### Option 1 - Automated

If you are using Prebid.js v7.13.0+, bidders may be added to or removed from the acbidders config directly within the Permutive Dashboard.

**Permutive can do this on your behalf**. Simply contact your Permutive CSM with strategicpartnershipops@permutive.com on cc,
indicating which bidders you would like added.

Or, a publisher may do this themselves within the Permutive Dashboard using the below instructions.

##### Create Integration

In order to manage acbidders via the Permutive dashboard, it is necessary to first enable the Prebid integration via the integrations page (settings).

**Note on Revenue Insights:** The prebid integration includes a feature for revenue insights,
which is not required for the purpose of updating acbidders config.
Please see [this document](https://support.permutive.com/hc/en-us/articles/360019044079-Revenue-Insights) for more information about revenue insights.

##### Update acbidders

The input for the “Data Provider config” is a multi-input free text. A valid “bidder code” needs to be entered in order to enable Standard or Advertiser Cohorts to be passed to the desired partner. The [prebid Bidders page](https://docs.prebid.org/dev-docs/bidders.html) contains instructions and a link to a list of possible bidder codes.

Bidders can be added or removed from acbidders using this feature, however, this will not impact any bidders that have been applied using the manual method below.

#### Option 2 - Manual

As a secondary option, bidders may be added manually.

To do so, define which bidders should receive Standard or Advertiser Cohorts by
including the _bidder code_ of any bidder in the `acBidders` array.

**Note:** If you ever need to remove a manually-added bidder, the bidder will also need to be removed manually.
