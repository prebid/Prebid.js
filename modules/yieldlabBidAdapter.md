# Overview

```
Module Name: Yieldlab Bidder Adapter
Module Type: Bidder Adapter
Maintainer: solutions@yieldlab.de
```

# Description

Module that connects to Yieldlab's demand sources

# Test Parameters
```
    var adUnits = [
           {
               code: "banner",
               sizes: [[728, 90]],
               bids: [{
                   bidder: "yieldlab",
                   params: {
                       placement: "5220336",
                       accountId: "1381604",
                       adSize: "728x90"
                   }
               }]
           }, {
               code: "video",
               sizes: [[640, 480]],
               mediaTypes: {
                   video: {
                       context: "instream"
                   }
               },
               bids: [{
                   bidder: "yieldlab",
                   params: {
                       placementId: "5220339",
                       accountId: "1381604",
                       adSize: "640x480"
                   }
               }]
           }
       ];
```
