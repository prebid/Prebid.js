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
                           pubId: 123, 
                           medId: "m_00a95d003340dbb2fcb8ee668a84fa",
                           zoneId: "z_261b6c7e7d4d4985393b293cc903d1",
                           force_bid: true
                       }
                   }
               ]
           }
       ];
```