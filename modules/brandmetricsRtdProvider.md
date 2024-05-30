# Brandmetrics Real-time Data Submodule
This module is intended to be used by brandmetrics (https://brandmetrics.com) partners and sets targeting keywords to bids if the browser is eligeble to see a brandmetrics survey.
The module hooks in to brandmetrics events and requires a brandmetrics script to be running. The module can optionally load and initialize brandmetrics by providing the 'scriptId'- parameter.

## Usage
Compile the Brandmetrics RTD module into your Prebid build:
```
gulp build --modules=rtdModule,brandmetricsRtdProvider
```

> Note that the global RTD module, `rtdModule`, is a prerequisite of the Brandmetrics RTD module.

Enable the Brandmetrics RTD in your Prebid configuration, using the below format:

```javascript
pbjs.setConfig({
  ...,
  realTimeData: {
    auctionDelay: 500,
    dataProviders: [{
      name: 'brandmetrics',
      waitForIt: true,
      params: {
        scriptId: '00000000-0000-0000-0000-000000000000',
        bidders: ['ozone']
      }
    }]
  },
  ...
})
```
The scriptId- parameter is provided by brandmetrics or a brandmetrics partner.

## Parameters
| Name              | Type                 | Description        | Default        |
| ----------------- | -------------------- | ------------------ | ------------------ |
| name              | String               | This should always be `brandmetrics` | - |
| waitForIt         | Boolean              | Should be `true` if there's an `auctionDelay` defined (recommended) | `false` |
| params            | Object               |                 | - |
| params.bidders    | String[]             | An array of bidders which should receive targeting keys. | `[]` |
| params.scriptId   | String               | A script- id GUID if the brandmetrics- script should be initialized. | `undefined` |

## Billable events
The module emits a billable event for creatives that are measured by brandmetrics and are considered in- view.

```javascript
{
  vendor: 'brandmetrics',
  type: 'creative_in_view',
  measurementId: string, // UUID, brandmetrics measurement id
  billingId: string, // UUID, unique billing id
  auctionId: string, // Prebid auction id
  transactionId: string, //Prebid transaction id
}
```