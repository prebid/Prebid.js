# WURFL Real-time Data Submodule

## Overview

    Module Name: WURFL Rtd Provider
    Module Type: Rtd Provider
    Maintainer: prebid@scientiamobile.com

## Description

The WURFL RTD module enriches the OpenRTB 2.0 device data with [WURFL data](https://www.scientiamobile.com/wurfl-js-business-edition-at-the-intersection-of-javascript-and-enterprise/).
The module sets the WURFL data in `device.ext.wurfl` and all the bidder adapters will always receive the low entry capabilities like `is_mobile`, `complete_device_name` and `form_factor`, and the `wurfl_id`.

For a more detailed analysis bidders can subscribe to detect iPhone and iPad models and receive additional [WURFL device capabilities](https://www.scientiamobile.com/capabilities/?products%5B%5D=wurfl-js).

**Note:** This module loads a dynamically generated JavaScript from prebid.wurflcloud.com

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
    dataProviders: [
      {
        name: "wurfl",
      },
    ],
  },
});
```

### Parameters

| Name                | Type    | Description                                                      | Default        |
| :------------------ | :------ | :--------------------------------------------------------------- | :------------- |
| name                | String  | Real time data module name                                       | Always 'wurfl' |
| waitForIt           | Boolean | Should be `true` if there's an `auctionDelay` defined (optional) | `false`        |
| params              | Object  |                                                                  |                |
| params.altHost      | String  | Alternate host to connect to WURFL.js                            |                |
| params.abTest       | Boolean | Enable A/B testing mode                                          | `false`        |
| params.abName       | String  | A/B test name identifier                                         | `'unknown'`    |
| params.abSplit      | Number  | Fraction of users in treatment group (0-1)                       | `0.5`          |
| params.abExcludeLCE | Boolean | Don't apply A/B testing to LCE bids                              | `true`         |

### A/B Testing

The WURFL RTD module supports A/B testing to measure the impact of WURFL enrichment on ad performance:

```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 1000,
    dataProviders: [
      {
        name: "wurfl",
        waitForIt: true,
        params: {
          abTest: true,
          abName: "pub_test_sept23",
          abSplit: 0.5, // 50% treatment, 50% control
        },
      },
    ],
  },
});
```

- **Treatment group** (`abSplit` \* 100%): Module enabled, bid requests enriched with WURFL device data
- **Control group** ((1 - `abSplit`) \* 100%): Module disabled, no enrichment occurs
- Assignment is random on each page load based on `Math.random()`
- Example: `abSplit: 0.75` means 75% get WURFL enrichment, 25% don't

## Testing

To view an example of how the WURFL RTD module works :

`gulp serve --modules=wurflRtdProvider,appnexusBidAdapter`

and then point your browser at:

`http://localhost:9999/integrationExamples/gpt/wurflRtdProvider_example.html`
