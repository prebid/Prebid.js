# Overview

```
Module Name: Yieldlab Bidder Adapter
Module Type: Bidder Adapter
Maintainer: api@platform-lunar.com
```

# Description

Module that connects to Yieldlab's demand sources

# Test Parameters
```
    var adUnits = [
           {
               code: "test1",
               sizes: [[800, 250]]
               bids: [{
                   bidder: "yieldlab",
                   params: {
                       placement: "4206978",
                       accountId: "2358365",
                       adSize: "800x250"
                   }
               }]
           }, {
               code: "test2",
               sizes: [[1, 1]],
               mediaTypes: {
                   video: {
                       context: "instream"
                   }
               },
               bids: [{
                   bidder: "yieldlab",
                   params: {
                       placementId: "4207034",
                       accountId: "2358365",
                       adSize: "1x1"
                   }
               }]
           }
       ];
```
