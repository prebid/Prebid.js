# Mantis Real-time Data Submodule

## Overview

    Module Name: Mantis Rtd Provider
    Module Type: Rtd Provider
    Maintainer: externalservices@mantis-intelligence.com

## Description

The Mantis RTD module appends User and Contextual segments to the bidding object.

## Usage

### Build
```
gulp build --modules="rtdModule,mantisRtdProvider,appnexusBidAdapter,..."  
```

> Note that the global RTD module `rtdModule`, is a prerequisite of the Mantis RTD module.

### Configuration

Use `setConfig` to instruct Prebid.js to initilize the Mantis RTD module, as specified below. 

This module is configured as part of the `realTimeData.dataProviders`

```javascript
pbjs.setConfig({
    realTimeData: {
        auctionDelay: 300,
        dataProviders: [{
            name: 'mantis',
            waitForIt: true,
            params: {
              endpoint: 'https://api.example.com/customer/example'
            }
        }]
    }
});
```

### Parameters 

| Name                      | Type          | Description                                                      | Default           |
| :------------------------ | :------------ | :--------------------------------------------------------------- |:----------------- |
| name                      | String        | Real time data module name                                       | Always 'mantis'   |
| waitForIt                 | Boolean       | Should be `true` if there's an `auctionDelay` defined (optional) | `false`           |
| params                    | Object        |                                                                  |                   |
| params.endpoint         | String        | Your Mantis api endpoint                                          |                   |

