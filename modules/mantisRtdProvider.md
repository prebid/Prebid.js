# Mantis Real-time Data Submodule

## Overview

```
Module Name: Mantis Rtd Provider
Module Type: Rtd Provider
Maintainer: externalservices@mantis-intelligence.com
```

## Description

The Mantis RTD module appends User and Contextual segments to the bidding object.

## Usage

### Build

```
gulp build --modules="rtdModule,mantisRtdProvider,appnexusBidAdapter,..."
```

> Note that the global RTD module `rtdModule` is a prerequisite of the Mantis RTD module.

### Configuration

Use `setConfig` to instruct Prebid.js to initialize the Mantis RTD module, as specified below.

This module is configured as part of `realTimeData.dataProviders`.

```javascript
pbjs.setConfig({
    realTimeData: {
        auctionDelay: 300, // Maximum time (in ms) to pause the auction. Preferred to have with a lowest possible value because mantis api needs at least few milliseconds to respond with contextual data
        dataProviders: [{
            name: 'mantis',
            waitForIt: true, // Pauses the auction for mantis RTD provider. Optional but should be set true if 'auctionDelay' is provided
            params: {
                endpoint: 'https://api.example.com/customer/example'
            }
        }]
    }
});
```

### Parameters

| Name              | Type    | Description                                                       | Default         |
| :---------------- | :------ | :---------------------------------------------------------------- | :-------------- |
| name              | String  | Real time data module name                                        | Always `mantis` |
| waitForIt         | Boolean | Should be `true` if there's an `auctionDelay` defined (optional) | `false`         |
| params            | Object  |                                                                   |                 |
| params.endpoint   | String  | Your Mantis API endpoint                                          |                 |
| auctionDelay      | Number  | Maximum time (ms) to wait for the Mantis API before the auction proceeds. This is optional but should be passed with a lowest possible value like 300 etc.     | `0`             |
