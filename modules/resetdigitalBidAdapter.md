# Overview

```
Module Name: ResetDigital Bidder Adapter
Module Type: Bidder Adapter
Maintainer: bruce@resetdigital.co
```

# Description

Prebid adapter for Reset Digital. Requires approval and account setup.
Video is supported but requires a publisher supplied renderer at this time.

# Test Parameters

## Web
```
    var adUnits = [
           {
               code: 'your-div',
               mediaTypes: {
                   banner: {
                       sizes: [[300,250]]
                   }
               },
               bids: [
                   {
                       bidder: "resetdigital",
                       params: {
                           pubId: "your-pub-id",
                           forceBid: true
                       }
                   }
               ]
           }
       ];
```
