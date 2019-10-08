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
               mediaTypes: {
                   banner: {
                       sizes: [[300,250]]
                   },
                   video: {
                       context: 'outstream',
                       playerDimension: [640, 480]
                   }
               },
               bids: [
                   {
                       bidder: "smartrtb",
                       params: {
                           zoneId: "N4zTDq3PPEHBIODv7cXK",
                           forceBid: true
                       }
                   }
               ]
           }
       ];
```