# 1plusX Real-time Data Submodule

## Overview

    Module Name: 1plusX Rtd Provider
    Module Type: Rtd Provider
    Maintainer: dc-team-1px@triplelift.com

## Description

The 1plusX RTD module appends User and Contextual segments to the bidding object.

## Usage

### Build
```
gulp build --modules="rtdModule,1plusXRtdProvider,appnexusBidAdapter,..."  
```

> Note that the global RTD module, `rtdModule`, is a prerequisite of the 1plusX RTD module.

### Configuration

Use `setConfig` to instruct Prebid.js to initilize the 1plusX RTD module, as specified below. 

This module is configured as part of the `realTimeData.dataProviders`

```javascript
var TIMEOUT = 1000;
pbjs.setConfig({
    realTimeData: {
        auctionDelay: TIMEOUT,
        dataProviders: [{
            name: '1plusX',
            waitForIt: true,
            params: {
                customerId: 'acme',
                bidders: ['appnexus', 'rubicon'],
                timeout: TIMEOUT
            }
        }]
    }
});
```

### Parameters 

| Name              | Type          | Description                                                      | Default           |
| :---------------- | :------------ | :--------------------------------------------------------------- |:----------------- |
| name              | String        | Real time data module name                                       | Always '1plusX'   |
| waitForIt         | Boolean       | Should be `true` if there's an `auctionDelay` defined (optional) | `false`           |
| params            | Object        |                                                                  |                   |
| params.customerId | String        | Your 1plusX customer id                                          |                   |
| params.bidders    | Array<string> | List of bidders for which you would like data to be set          |                   |
| params.timeout    | Integer       | timeout (ms)                                                     | 1000ms            |

## Testing 

To view an example of how the 1plusX RTD module works :

`gulp serve --modules=rtdModule,1plusXRtdProvider,appnexusBidAdapter,rubiconBidAdapter`

and then point your browser at:

`http://localhost:9999/integrationExamples/gpt/1plusXRtdProvider_example.html`
