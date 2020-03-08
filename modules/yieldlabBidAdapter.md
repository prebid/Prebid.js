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
                       adslotId: "5220336",
                       supplyId: "1381604",
                       adSize: "728x90",
                       targeting: {
                           key1: "value1",
                           key2: "value2"
                       },
                       extId: "abc"
                   }
               }]
           }, {
               code: "video",
               sizes: [[640, 480]],
               mediaTypes: {
                   video: {
                       context: "instream" // or "outstream"
                   }
               },
               bids: [{
                   bidder: "yieldlab",
                   params: {
                       adslotId: "5220339",
                       supplyId: "1381604",
                       adSize: "640x480"
                   }
               }]
           }
       ];
```
