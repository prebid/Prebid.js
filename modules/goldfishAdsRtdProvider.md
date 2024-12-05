# Goldfish Ads Real-time Data Submodule

## Overview

    Module Name: Goldfish Ads Rtd Provider
    Module Type: Rtd Provider
    Maintainer: keith@goldfishads.com

## Description

This RTD module provides access to the Goldfish Ads Geograph, which leverages geographic and temporal data on a privacy-first platform. This module works without using cookies, PII, emails, or device IDs across all website traffic, including unauthenticated users, and adds audience data into bid requests to increase scale and yields.

## Usage

### Build
```
gulp build --modules="rtdModule,goldfishAdsRtdProvider,appnexusBidAdapter,..."
```

> Note that the global RTD module, `rtdModule`, is a prerequisite of the Goldfish Ads RTD module.

### Configuration

Use `setConfig` to instruct Prebid.js to initialize the Goldfish Ads RTD module, as specified below.

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
| params.key       | String                                  | Your key id issued by Goldfish Ads                                            |                        |
