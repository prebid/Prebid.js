# GoldfishAds Real-time Data Submodule

## Overview

    Module Name: GoldfishAds Rtd Provider
    Module Type: Rtd Provider
    Maintainer: 

## Description

The GoldfishAds RTD module adds encrypted identifier envelope to the bidding object.

## Usage

### Build
```
gulp build --modules="rtdModule,goldfishAdsRtdProvider,appnexusBidAdapter,..."
```

> Note that the global RTD module, `rtdModule`, is a prerequisite of the GoldfishAds RTD module.

### Configuration

Use `setConfig` to instruct Prebid.js to initialize the GoldfishAds RTD module, as specified below.

This module is configured as part of the `realTimeData.dataProviders`

```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 300,
    dataProviders: [{
      name: 'goldfishAds',
      waitForIt: true,
      params: {
       key: 'testkey'
      }
    }]
  }
})
```

### Parameters
| Name             | Type                                    | Description                                                                  | Default                |
|:-----------------|:----------------------------------------|:-----------------------------------------------------------------------------|:-----------------------|
| name             | String                                  | Real time data module name                                                   | Always 'goldfishAds'   |
| waitForIt        | Boolean                                 | Set to true to maximize chance for bidder enrichment, used with auctionDelay | `false`                |
| params.key       | String                                  | Your key id issued by GoldfishAds                                            |                        |
