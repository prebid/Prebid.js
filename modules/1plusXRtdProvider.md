# 1plusX Real-time Data Submodule

## Overview

    Module Name: 1plusX Rtd Provider
    Module Type: Rtd Provider
    Maintainer: dev@1plusx.com 

## Description

RTD provider for 1plusX. 
Enriches the bidding object with Audience & Targeting data
Contact dev@1plusx.com for information.

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

| Name  |Type | Description   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| name  | String | Real time data module name | Always '1plusX' |
| waitForIt | Boolean | Should be `true` if there's an `auctionDelay` defined (optional) | `false` |
| params  | Object |   |   |
| params.customerId  | Integer | Your 1plusX customer id  |  |
| params.biders  | Array<string> | List of bidders for which you would like data to be set | To this date only `appnexus` and `rubicon` are supported |
| params.timeout  | Integer | timeout (ms) | 1000 |

## Supported Bidders
At the moment only Appnexus (`appnexus`) and Magnite (`rubicon`) are supported


| Bidder  | ID (for `bidders` parameter) | Module name (for `gulp build`) |
| ------- | ---------------------------- | ------------------------------ |
| Xandr   | `appnexus`                   | `appnexusBidAdapter`           |
| Magnite | `rubicon`                    | `rubiconBidAdapter`            |

## Testing 

To view an example of how the 1plusX RTD module works :

`gulp serve --modules=rtdModule,1plusXRtdProvider,appnexusBidAdapter,rubiconBidAdapter`

and then point your browser at:

`http://localhost:9999/integrationExamples/gpt/1plusXRtdProvider_example.html`
