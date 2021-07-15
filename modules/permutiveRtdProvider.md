# Permutive Real-time Data Submodule
This submodule reads segments from Permutive and attaches them as targeting keys to bid requests. Using this module will deliver best targeting results, leveraging Permutive's real-time segmentation and modelling capabilities.

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
Any bidder which support `ortb2.user.data` config is supported for Audience Connector cohorts (e.g. `trustx`). Additionally, the below bidders are supported with a custom parameters integration:

| Bidder      | ID         | Custom First-Party Segments | Audience Connector ("acBidders") |
| ----------- | ---------- | -------------------- | ------------------ |
| Xandr       | `appnexus` | Yes                  | Yes                |
| Magnite     | `rubicon`  | Yes                  | No                |
| Ozone       | `ozone`    | No                   | Yes                |

Key-values details for custom parameters:
* **First-party segments:** When enabling the respective Activation for a segment in Permutive, this module will automatically attach that segment to the bid request. There is no need to enable individual bidders in the module configuration, it will automatically reflect which SSP integrations you have enabled in your Permutive dashboard. Permutive segments will be sent in the `permutive` key-value.

* **Audience Connector:** You'll need to define which bidders should receive Audience Connector segments. You need to include the `ID` of any bidder in the `acBidders` array. Audience Connector segments will be sent in the `p_standard` key-value.


## Parameters
| Name              | Type                 | Description        | Default        |
| ----------------- | -------------------- | ------------------ | ------------------ |
| name              | String               | This should always be `permutive` | - |
| waitForIt         | Boolean              | Should be `true` if there's an `auctionDelay` defined (optional) | `false` |
| params            | Object               |                 | - |
| params.acBidders  | String[]             | An array of bidders which should receive AC segments. Pleasee see `Supported Bidders` for bidder support and possible values. | `[]` |
| params.maxSegs    | Integer              | Maximum number of segments to be included in either the `permutive` or `p_standard` key-value. | `500` |
