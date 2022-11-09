# Overview

Module Name: Oxxion Rtd Provider
Module Type: Rtd Provider
Maintainer: tech@oxxion.io

# Oxxion Real-Time-Data submodule

Oxxion helps you to understand how your prebid stack performs.
This Rtd module is to use in order to improve video events tracking.

# Integration

Make sure to have the following modules listed while building prebid : `rtdModule,oxxionRtdProvider`
`rtbModule` is required to activate real-time-data submodules.
For example :
```
gulp build --modules=schain,priceFloors,currency,consentManagement,appnexusBidAdapter,rubiconBidAdapter,rtdModule,oxxionRtdProvider
```

Then add the oxxion Rtd module to your prebid configuration :
```
pbjs.setConfig(
  ...
  realTimeData: {
    auctionDelay: 200,
    dataProviders: [
      {
          name: "oxxionRtd",
          waitForIt: true,
          params: {
            domain: "test.endpoint",
            contexts: ["instream"],
          }
       }
    ]
  }
  ...
)
```

# setConfig Parameters

| Name                             | Type     | Description                                                                                                 |
|:---------------------------------|:---------|:------------------------------------------------------------------------------------------------------------|
| domain                           | String   | This string identifies yourself in Oxxion's systems and is provided to you by your Oxxion representative.   |
| contexts                         | Array    | Array defining which video contexts to add tracking events into. Values can be instream and/or outstream.   |

