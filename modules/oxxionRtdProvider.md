# Overview

Module Name: Oxxion Rtd Provider
Module Type: Rtd Provider
Maintainer: tech@oxxion.io

# Oxxion Real-Time-Data submodule

Oxxion helps you to understand how your prebid stack performs.
This Rtd module is to use in order to improve video events tracking and/or to filter bidder requested.

# Integration

Make sure to have the following modules listed while building prebid : `rtdModule,oxxionRtdProvider`
`rtdModule` is required to activate real-time-data submodules.
For example :
```
gulp build --modules=schain,priceFloors,currency,consentManagement,appnexusBidAdapter,rubiconBidAdapter,rtdModule,oxxionRtdProvider
```

Then add the oxxion Rtd module to your prebid configuration :
```
pbjs.setConfig(
  ...
  realTimeData: {
    auctionDelay: 300,
    dataProviders: [
      {
          name: "oxxionRtd",
          waitForIt: true,
          params: {
            domain: "test.endpoint",
            contexts: ["instream"],
            threshold: false,
            samplingRate: 10,
          }
       }
    ]
  }
  ...
)
```

# setConfig Parameters General

| Name                             | Type     | Description                                                                                                 |
|:---------------------------------|:---------|:------------------------------------------------------------------------------------------------------------|
| domain                           | String   | This string identifies yourself in Oxxion's systems and is provided to you by your Oxxion representative.   |

# setConfig Parameters for Video Tracking

| Name                             | Type     | Description                                                                                                 |
|:---------------------------------|:---------|:------------------------------------------------------------------------------------------------------------|
| contexts                         | Array    | Array defining which video contexts to add tracking events into. Values can be instream and/or outstream.   |

# setConfig Parameters for bidder filtering

| Name                             | Type       | Description                                                                                                 |
|:---------------------------------|:-----------|:------------------------------------------------------------------------------------------------------------|
| threshold                        | Float/Bool | False or minimum expected bid rate to call a bidder (ex: 1.0 for 1% bid rate).                              |
| samplingRate                     | Integer    | Percentage of request not meeting the criterias to run anyway in order to check for any change.             |
| bidders                          | Array      | Optional: If set, filtering will only be applied to bidders listed. 

