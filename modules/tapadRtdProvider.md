# Tapad Real-time Data Submodule

## Overview

    Module Name: Tapad Rtd Provider
    Module Type: Rtd Provider
    Maintainer: team-ui@tapad.com

## Description

The Tapad RTD module adds encrypted identifier envelope to the bidding object.

## Usage

### Build
```
gulp build --modules="rtdModule,tapadRtdProvider,appnexusBidAdapter,..."
```

> Note that the global RTD module, `rtdModule`, is a prerequisite of the Tapad RTD module.

### Configuration

Use `setConfig` to instruct Prebid.js to initialize the Tapad RTD module, as specified below.

This module is configured as part of the `realTimeData.dataProviders`

```javascript
pbjs.setConfig({
  realTimeData: {
    dataProviders: [{
      name: 'tapad_rtd',
      waitForIt: true,
      params: {
        accountId: 123,
        bidders: ['sovrn', 'pubmatic']
      }
    }]
  }
})
```

### Parameters
| Name           | Type          | Description                                                      | Default            |
|:---------------|:--------------|:-----------------------------------------------------------------|:-------------------|
| name           | String        | Real time data module name                                       | Always 'tapad_rtd' |
| waitForIt      | Boolean       | Should be `true` if there's an `auctionDelay` defined (optional) | `false`            |
| accountId      | String        | Your account id issued by Tapad                                  |                    |
| bidders        | Array<string> | List of bidders for which you would like data to be set          |                    |
| params.timeout | Integer       | timeout (ms)                                                     | 1000ms             |
