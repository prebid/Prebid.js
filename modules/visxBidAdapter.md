# Overview

```
Module Name:    YOC VIS.X Bidder Adapter
Module Type:    Bidder Adapter
Maintainer:     service@yoc.com
```

# Description

Module that connects to YOC VIS.X® demand source to fetch bids.

# Test Parameters
```
    var adUnits = [
           // YOC Mystery Ad adUnit
           {
               code: 'yma-test-div',
               sizes: [[1, 1]],
               bids: [
                   {
                       bidder: 'visx',
                       params: {
                           uid: '903535'
                       }
                   }
               ]
           },
           // YOC Understitial Ad adUnit
           {
               code: 'yua-test-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: 'visx',
                       params: {
                           uid: '903536'
                       }
                   }
               ]
           }
       ];
```