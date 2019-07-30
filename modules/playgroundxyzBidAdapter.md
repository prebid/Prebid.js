# Overview

```
Module Name:  Playground XYZ Bid Adapter
Module Type:  Bidder Adapter
Maintainer: tech+prebid@playgroundxyz.com
```

# Description

Connects to playgroundxyz ad server for bids.

Playground XYZ bid adapter supports Banner.

# Test Parameters
```
var adUnits = [
   // Banner adUnit
   {
       code: 'banner-div',
       sizes: [[300, 250], [300,600]],
       bids: [{
         bidder: 'playgroundxyz',
         params: {
           placementId: '10433394'
         }
       }]
   }
];
```
