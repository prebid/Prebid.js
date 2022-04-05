# Permutive Real-time Data Submodule

This submodule reads cohorts from Permutive and attaches them as targeting keys to bid requests. Using this module will deliver best targeting results, leveraging Permutive's real-time segmentation and modelling capabilities.

## Usage

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

## Supported Bidders

The Permutive RTD module sets Audience Connector cohorts as bidder-specific `ortb2.user.data` first-party data, following the Prebid `ortb2` convention, for any bidder included in `acBidders`. The module also supports bidder-specific data locations per ad unit (custom parameters) for the below bidders:

| Bidder  | ID         | Custom Cohorts | Audience Connector |
| ------- | ---------- | -------------- | ------------------ |
| Xandr   | `appnexus` | Yes            | Yes                |
| Magnite | `rubicon`  | Yes            | No                 |
| Ozone   | `ozone`    | No             | Yes                |

Key-values details for custom parameters:

- **Custom Cohorts:** When enabling the respective Activation for a cohort in Permutive, this module will automatically attach that cohort ID to the bid request. There is no need to enable individual bidders in the module configuration, it will automatically reflect which SSP integrations you have enabled in your Permutive dashboard. Permutive cohorts will be sent in the `permutive` key-value.

- **Audience Connector:** You'll need to define which bidders should receive Audience Connector cohorts. You need to include the `ID` of any bidder in the `acBidders` array. Audience Connector cohorts will be sent in the `p_standard` key-value.

## Parameters

| Name                   | Type     | Description                                                                                   | Default |
| ---------------------- | -------- | --------------------------------------------------------------------------------------------- | ------- |
| name                   | String   | This should always be `permutive`                                                             | -       |
| waitForIt              | Boolean  | Should be `true` if there's an `auctionDelay` defined (optional)                              | `false` |
| params                 | Object   |                                                                                               | -       |
| params.acBidders       | String[] | An array of bidders which should receive AC cohorts.                                          | `[]`    |
| params.maxSegs         | Integer  | Maximum number of cohorts to be included in either the `permutive` or `p_standard` key-value. | `500`   |
| params.transformations | Object[] | An array of configurations for ORTB2 user data transformations                                |         |

### The `transformations` parameter

This array contains configurations for transformations we'll apply to the Permutive object in the ORTB2 `user.data` array. The results of these transformations will be appended to the `user.data` array that's attached to ORTB2 bid requests.

#### Supported transformations

| Name           | ID  | Config structure                                  | Description                                                                          |
| -------------- | --- | ------------------------------------------------- | ------------------------------------------------------------------------------------ |
| IAB taxonomies | iab | { segtax: number, iabIds: Object<number, number>} | Transform segment IDs from Permutive to IAB (note: alpha version, subject to change) |
