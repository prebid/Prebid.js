# Nodals AI Real-Time Data Module

## Overview

Module Name: Nodals AI Rtd Provider
Module Type: Rtd Provider
Maintainer: prebid-integrations@nodals.ai

Nodals AI provides a real-time data prebid module that will analyse first-party signals present on page load, determine the value of them to Nodals’ advertisers and add a key-value to the ad server call to indicate that value. The Nodals AI RTD module loads external code as part of this process.

In order to be able to utilise this module, please contact [info@nodals.ai](mailto:info@nodals.ai) for account setup and detailed GAM setup instructions.

## Build

First, ensure that you include the generic Prebid RTD Module _and_ the Nodals AI RTD module into your Prebid build:

```bash
gulp build --modules=rtdModule,nodalsAiRtdProvider
```

## Configuration

Update your Prebid configuration to enable the Nodals AI RTD module, as illustrated in the example below:

```javascript
pbjs.setConfig({
  ...,
  realTimeData: {
    auctionDelay: 100, // optional auction delay
    dataProviders: [{
      name: 'nodalsAi',
      waitForIt: true, // should be true only if there's an `auctionDelay`
      params: {
        propertyId: 'c10516af' // obtain your property id from Nodals AI support
      }
    }]
  },
  ...
})
```

Configuration parameters:

{: .table .table-bordered .table-striped }

| Name                              | Scope    | Description                                                                                                           | Example                     | Type            |
| --------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------- | --------------- |
| `name`                            | required | Real time data module name: Always `'nodalsAi'`                                                                       | `'nodalsAi'`                | `String`        |
| `waitForIt`                       | optional | Set to `true` if there's an `auctionDelay` defined (defaults to `false`)                                              | `false`                     | `Boolean`       |
| `params`                          | required | Submodule configuration parameters                                                                                    | `{}`                        | `Object`        |
| `params.propertyId`               | required | Publisher specific identifier, provided by Nodals AI                                                                  | `'76346cf3'`                | `String`        |
| `params.storage`                  | optional | Optional storage configiration                                                                                        | `{}`                        | `Object`        |
| `params.storage.key`              | optional | Storage key used to store Nodals AI data in local storage                                                             | `'yourKey'`                 | `String`        |
| `params.storage.ttl`              | optional | Time in seconds to retain Nodals AI data in storage until a refresh is required                                       | `900`                       | `Integer`       |
| `params.ptr`                      | optional | Optional partner configiration                                                                                        | `{}`                        | `Object`        |
| `params.ptr.permutive`            | optional | Optional configiration for Permutive Audience Platform                                                                | `{}`                        | `Object`        |
| `params.ptr.permutive.cohorts`    | optional | A method for the publisher to explicitly supply Permutive Cohort IDs, disabling automatic fetching by this RTD module | `['66711', '39032', '311']` | `Array<String>` |
| `params.ptr.permutive.storageKey` | optional | Publisher specific Permutive storage key where cohort data is held.                                                   | `'_psegs'`                  | `String`        |
