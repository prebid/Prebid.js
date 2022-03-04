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
    auctionDelay: 500, // auction delay
    dataProviders: [{
      name: 'brandmetrics',
      waitForIt: true // should be true if there's an `auctionDelay`,
      params: {
        scriptId: '00000000-0000-0000-0000-000000000000',
        bidders: ['ozone']
      }
    }]
  },
  ...
})
```

## Parameters
| Name              | Type                 | Description        | Default        |
| ----------------- | -------------------- | ------------------ | ------------------ |
| name              | String               | This should always be `brandmetrics` | - |
| waitForIt         | Boolean              | Should be `true` if there's an `auctionDelay` defined (recommended) | `false` |
| params            | Object               |                 | - |
| params.bidders    | String[]             | An array of bidders which should receive targeting keys. | `[]` |
| params.scriptId   | String               | A script- id GUID if the brandmetrics- script should be initialized. | `undefined` |
