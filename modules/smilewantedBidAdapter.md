# Overview

```
Module Name: SmileWanted Bidder Adapter
Module Type: Bidder Adapter
Maintainer: maxime@smilewanted.com
```

# Description

To use us as a bidder you must have an account and an active "zoneId" on our SmileWanted platform.

# Test Parameters

## Web
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "smilewanted",
                       params: {
                            zoneId: 1
                       }
                   }
               ]
           }
       ];
```