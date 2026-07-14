# Mantis Real-time Data Submodule

## Overview

```
Module Name: Mantis Rtd Provider
Module Type: Rtd Provider
Maintainer: externalservices@mantis-intelligence.com
```

## Description
The Mantis RTD provider module for Prebid.js enables publishers to enrich ad auction requests with contextual intelligence from the Mantis API. It runs client-side as part of the Prebid RTD framework and injects structured signals — brand safety ratings, sentiment, emotions, and content categories — into OpenRTB (`ortb2`) objects before bidding occurs, allowing demand partners to make more informed bidding decisions.

## Usage

### Build

```bash
gulp build --modules="rtdModule,mantisRtdProvider,appnexusBidAdapter,..."
```

> Note that the global RTD module `rtdModule` is a prerequisite of the Mantis RTD module.

### Configuration

Use `setConfig` to instruct Prebid.js to initialize the Mantis RTD module, as specified below.

This module is configured as part of `realTimeData.dataProviders`.

```javascript
pbjs.setConfig({
    realTimeData: {
        auctionDelay: 1000, // Optional but recommended to set '1000'.
        dataProviders: [{
            name: 'mantis',
            waitForIt: true, // Optional but should be set 'true' if 'auctionDelay' is provided
            params: {
                endpoint: 'https://example.com/api' // API url provided by Mantis
            }
        }]
    }
});
```

### Parameters

| Name              | Type    | Description                                                                                                                                                                       | Required | Notes                                                                    |
| :---------------- | :------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------- | :----------------------------------------------------------------------- |
| `auctionDelay`    | Number  | Maximum time (ms) the auction will be delayed so that RTD providers can fetch the user/contextual data from their api and sets the values before triggering the ad server request | no       | This is optional but should be passed with an optimum value like `1000`  |
| `name`            | String  | Real time data module name                                                                                                                                                        | yes      | Always `mantis`                                                          |
| `waitForIt`       | Boolean | Should be `true` if there's an `auctionDelay` defined                                                                                                                            | no       | Default `false`                                                          |
| `params`          | Object  | Defines parameter(s) used in Mantis RTD module                                                                                                                                    | yes      | Default `null`                                                           |
| `params.endpoint` | String  | Mantis article classification API endpoint. Mantis team provides this url to each publisher after their account setup is completed by Mantis tech team                            | yes      | Default `empty`                                                          |

---

## Debugging

Filter console logs by `mantisRtdProvider:` to see init, timeout, and error messages. Check the network tab for the GET request to the configured `endpoint`.
