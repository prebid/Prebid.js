# 152media (Oftmedia) Real-time Data Submodule

## Overview

    Module Name: 152media (Oftmedia) RTD Provider
    Module Type: RTD Provider
    Maintainer: hello@152media.com

## Description

The 152media RTD module enhances programmatic advertising by providing real-time contextual data and audience insights. Publishers can use this module to augment ad requests with relevant targeting parameters, optimize revenue through improved ad relevance, and filter out requests that are inefficient or provide no value to buyers. The module leverages AI models to generate optimized deals and augment targeting signals for enhanced bid performance.

## Usage

### Build
```
gulp build --modules="rtdModule,oftmediaRtdProvider"  
```

> Note that the global RTD module, `rtdModule`, is a prerequisite of the 152media RTD module.

### Configuration

Use `setConfig` to instruct Prebid.js to initialize the 152media RTD module, as specified below. 


```javascript
pbjs.setConfig({
   "realTimeData":{
      "auctionDelay":500, // Recommended value
      "dataProviders":[
         {
            "name":"oftmedia",
            "waitForIt":true, // Recommended value
            "params":{
               "publisherId": "0653b3fc-a645-4bcc-bfee-b8982974dd53", // The Publisher ID is provided by 152Media. For assistance, contact hello@152media.com.
               "keywords":[    // Keywords provided by 152Media
                  "red",
                  "blue",
                  "white"
               ],
               "bidderCode": "appnexus", // Define the bidder code to enable optimization.
               "enrichRequest": true // Optional: Set to true to enrich the request with additional targeting data.
            }
         }
      ]
   }
});
```

### Parameters 

| Name                      | Type          | Description                                                      | Default           |
| :------------------------ | :------------ | :--------------------------------------------------------------- |:----------------- |
| name                      | String        | Real time data module name                                       | Always 'oftmedia' |
| waitForIt                 | Boolean       | Should be `true` if there's an `auctionDelay` defined (optional) | `false`           |
| params.publisherId        | String        | Your 152media publisher ID                                       |                   |
| params.keywords           | Array<string> | List of contextual keywords for targeting enhancement            | []                |
| params.bidderCode         | String        | Primary bidder code for optimization                             |
| params.timeout            | Integer       | Request timeout in milliseconds                                  | 1000ms            |
| params.enrichRequest      | Boolean       | Set to `true` to enrich the request with  data                   | `false`           |

## Support

If you have any questions or need assistance with implementation, please reach out to us at hello@152media.com.
