# WURFL Real-time Data Submodule

## Overview

    Module Name: WURFL Rtd Provider
    Module Type: Rtd Provider
    Maintainer: prebid@scientiamobile.com

## Description

The WURFL RTD module enriches the OpenRTB 2.0 device data with [WURFL data](https://www.scientiamobile.com/wurfl-js-business-edition-at-the-intersection-of-javascript-and-enterprise/).
The module sets the WURFL data in `device.ext.wurfl` and all the bidder adapters will always receive the low entry capabilites like `is_mobile`, `complete_device_name` and `form_factor`. 

For a more detailed analysis bidders can subscribe to detect iPhone and iPad models and receive additional [WURFL device capabilities](https://www.scientiamobile.com/capabilities/?products%5B%5D=wurfl-js).

## User-Agent Client Hints

WURFL.js is fully compatible with Chromium's User-Agent Client Hints (UA-CH) initiative. If User-Agent Client Hints are absent in the HTTP headers that WURFL.js receives, the service will automatically fall back to using the User-Agent Client Hints' JS API to fetch [high entropy client hint values](https://wicg.github.io/ua-client-hints/#getHighEntropyValues) from the client device. However, we recommend that you explicitly opt-in/advertise support for User-Agent Client Hints on your website and delegate them to the WURFL.js service for the fastest detection experience. Our documentation regarding implementing User-Agent Client Hint support [is available here](https://docs.scientiamobile.com/guides/implementing-useragent-clienthints). 

## Usage

### Build
```
gulp build --modules="wurflRtdProvider,appnexusBidAdapter,..."  
```

### Configuration

Use `setConfig` to instruct Prebid.js to initilize the WURFL RTD module, as specified below. 

This module is configured as part of the `realTimeData.dataProviders`

```javascript
var TIMEOUT = 1000;
pbjs.setConfig({
    realTimeData: {
        auctionDelay: TIMEOUT,
        dataProviders: [{
            name: 'wurfl',
            waitForIt: true,
            params: {
                debug: false
            }
        }]
    }
});
```

### Parameters 

| Name                      | Type          | Description                                                      | Default           |
| :------------------------ | :------------ | :--------------------------------------------------------------- |:----------------- |
| name                      | String        | Real time data module name                                       | Always 'wurfl'    |
| waitForIt                 | Boolean       | Should be `true` if there's an `auctionDelay` defined (optional) | `false`           |
| params                    | Object        |                                                                  |                   |
| params.altHost            | String        | Alternate host to connect to WURFL.js                            |                   |
| params.debug              | Boolean       | Enable debug                                                     | `false`           |

## Testing 

To view an example of how the WURFL RTD module works :

`gulp serve --modules=wurflRtdProvider,appnexusBidAdapter`

and then point your browser at:

`http://localhost:9999/integrationExamples/gpt/wurflRtdProvider_example.html`
