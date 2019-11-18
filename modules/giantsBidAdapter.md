# Overview

```
Module Name:  Giants Bid Adapter
Module Type:  Bidder Adapter
Maintainer: info@prebid.org
```

# Description

Connects to Giants exchange for bids.

Giants bid adapter supports Banner.

# Test Parameters
```
var adUnits = [
   // Banner adUnit
   {
       code: 'banner-div',
       sizes: [[300, 250], [300,600]],
       bids: [{
         bidder: 'giants',
         params: {
           zoneId: '584072408'
         }
       }]
   }
];
```