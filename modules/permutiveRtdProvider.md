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
        acBidders: ['appnexus', 'rubicon', 'ozone']
      }
    }]
  },
  ...
})
```

## Supported Bidders
The below bidders are currently support by the Permutive RTD module. Please reach out to your Permutive Account Manager to request support for any additional bidders.

| Bidder      | ID         | First-party segments | Audience Connector |
| ----------- | ---------- | -------------------- | ------------------ |
| Xandr       | `appnexus` | Yes                  | Yes                |
| Magnite     | `rubicon`  | Yes                  | Yes                |
| Ozone       | `ozone`    | No                   | Yes                |
| TrustX      | `trustx`   | No                   | Yes                |

* **First-party segments:** When enabling the respective Activation for a segment in Permutive, this module will automatically attach that segment to the bid request. There is no need to enable individual bidders in the module configuration, it will automatically reflect which SSP integrations you have enabled in Permutive. Permutive segments will be sent in the `permutive` key-value.

* **Audience Connector:** You'll need to define which bidder should receive Audience Connector segments. You need to include the `ID` of any bidder in the `acBidders` array. Audience Connector segments will be sent in the `p_standard` key-value.


## Parameters
| Name              | Type                 | Description        | Default        |
| ----------------- | -------------------- | ------------------ | ------------------ |
| name              | String               | This should always be `permutive` | - |
| waitForIt         | Boolean              | Should be `true` if there's an `auctionDelay` defined (optional) | `false` |
| params            | Object               |                 | - |
| params.acBidders  | String[]             | An array of bidders which should receive AC segments. Pleasee see `Supported Bidders` for bidder support and possible values. | `[]` |
| params.maxSegs    | Integer              | Maximum number of segments to be included in either the `permutive` or `p_standard` key-value. | `500` |
| params.overwrites | Object               | See `Custom Bidder Setup` for details on how to define custom bidder functions.      | `{}` |


## Custom Bidder Setup
You can overwrite the default bidder function, for example to include a different set of segments or to support additional bidders. The below example modifies what first-party segments Magnite receives (segments from `gam` instead of `rubicon`). As best practise we recommend to first call `defaultFn` and then only overwrite specific key-values. The below example only overwrites `permutive` while `p_standard` are still set by `defaultFn` (if `rubicon` is an enabled `acBidder`).

```javascript
pbjs.setConfig({
  ...,
  realTimeData: {
    auctionDelay: 50,
    dataProviders: [{
      name: 'permutive',
      waitForIt: true,
      params: {
        acBidders: ['appnexus', 'rubicon'],
        maxSegs: 450,
        overwrites: {
          rubicon: function (bid, data, acEnabled, utils, defaultFn) {
            if (defaultFn){
              bid = defaultFn(bid, data, acEnabled)
            }
            if (data.gam && data.gam.length) {
              utils.deepSetValue(bid, 'params.visitor.permutive', data.gam)
            }
          }
        }
      }
    }]
  },
  ...
})
```
Any custom bidder function will receive the following parameters:

| Name          | Type          | Description                             |
| ------------- |-------------- | --------------------------------------- |
| bid           | Object        | The bidder specific bidder object. You will mutate this object to set the appropriate targeting keys.       |
| data          | Object        | An object containing Permutive segments |
| data.appnexus | string[]      | Segments exposed by the Xandr SSP integration |
| data.rubicon  | string[]      | Segments exposed by the Magnite SSP integration  |
| data.gam      | string[]      | Segments exposed by the Google Ad Manager integration |
| data.ac       | string[]      | Segments exposed by the Audience Connector |
| acEnabled     | Boolean       | `true` if the current bidder in included in `params.acBidders` |
| utils         | {}            | An object containing references to various util functions used by `permutiveRtdProvider.js`. Please make sure not to overwrite any of these. |
| defaultFn     | Function      | The default function for this bidder. Please note that this can be `undefined` if there is no default function for this bidder (see `Supported Bidders`). The function expect the following parameters: `bid`, `data`, `acEnabled` and will return `bid`. |

**Warning**

The custom bidder function will mutate the `bid` object. Please be aware that this could break your bid request if you accidentally overwrite any fields other than the `permutive` or `p_standard` key-values or if you change the structure of the `bid` object in any way.
