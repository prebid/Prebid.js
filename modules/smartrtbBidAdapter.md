# Overview

```
Module Name: Smart RTB (smrtb.com) Bidder Adapter
Module Type: Bidder Adapter
Maintainer: evanm@smrtb.com
```

# Description

Prebid adapter for Smart RTB. Requires approval and account setup.

# Test Parameters

## Web
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "smartrtb",
                       params: {
                           zoneId: "z_261b6c7e7d4d4985393b293cc903d1",
                           forceBid: true
                       }
                   }
               ]
           }
       ];
```