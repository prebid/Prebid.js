# Experian Real-time Data Submodule

## Overview

    Module Name: Experian Rtd Provider
    Module Type: Rtd Provider
    Maintainer: team-ui@tapad.com

## Description

The Experian RTD module adds encrypted identifier envelope to the bidding object.

## Usage

### Build
```
gulp build --modules="rtdModule,experianRtdProvider,appnexusBidAdapter,..."
```

> Note that the global RTD module, `rtdModule`, is a prerequisite of the Experian RTD module.

### Configuration

Use `setConfig` to instruct Prebid.js to initialize the Experian RTD module, as specified below.

This module is configured as part of the `realTimeData.dataProviders`

```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 300,
    dataProviders: [{
      name: 'experian_rtid',
      waitForIt: true,
      params: {
        accountId: 'ZylatYg',
        bidders: ['sovrn', 'pubmatic'],
        ids: { maid: ['424', '2982'], hem: 'my-hem' }
      }
    }]
  }
})
```

### Parameters
| Name             | Type                                    | Description                                                                  | Default                |
|:-----------------|:----------------------------------------|:-----------------------------------------------------------------------------|:-----------------------|
| name             | String                                  | Real time data module name                                                   | Always 'experian_rtid' |
| waitForIt        | Boolean                                 | Set to true to maximize chance for bidder enrichment, used with auctionDelay | `false`                |
| params.accountId | String                                  | Your account id issued by Experian                                           |                        |
| params.bidders   | Array<string>                           | List of bidders for which you would like data to be set                      |                        |
| params.ids       | Record<string, Array<string> or string> | Additional identifiers to send to Experian RTID endpoint                     |                        |
