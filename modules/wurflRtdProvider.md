# WURFL Real-time Data Submodule

## Overview

    Module Name: WURFL Rtd Provider
    Module Type: Rtd Provider
    Maintainer: prebid@scientiamobile.com

## Description

The WURFL RTD module enriches Prebid.js bid requests with comprehensive device detection data.

The WURFL RTD module relies on localStorage caching and local client-side detection, providing instant device enrichment on every page load.

The module enriches `ortb2.device` with complete device information and adds extended WURFL capabilities to `device.ext.wurfl`, ensuring all bidder adapters have immediate access to enriched device data.

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
pbjs.setConfig({
  realTimeData: {
    dataProviders: [
      {
        name: "wurfl",
      },
    ],
  },
});
```

### Parameters

| Name           | Type    | Description                                | Default        |
| :------------- | :------ | :----------------------------------------- | :------------- |
| name           | String  | Real time data module name                 | Always 'wurfl' |
| params         | Object  |                                            |                |
| params.altHost | String  | Alternate host to connect to WURFL.js      |                |
| params.abTest  | Boolean | Enable A/B testing mode                    | `false`        |
| params.abName  | String  | A/B test name identifier                   | `'unknown'`    |
| params.abSplit | Number  | Fraction of users in treatment group (0-1) | `0.5`          |

### A/B Testing

The WURFL RTD module supports A/B testing to measure the impact of WURFL enrichment on ad performance:

```javascript
pbjs.setConfig({
  realTimeData: {
    dataProviders: [
      {
        name: "wurfl",
        params: {
          abTest: true,
          abName: "pub_test",
          abSplit: 0.75, // 75% treatment, 25% control
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
