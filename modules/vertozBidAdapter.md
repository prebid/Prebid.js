# Overview

```
Module Name:  Vertoz Bidder Adapter
Module Type:  Bidder Adapter
Maintainer: prebid-team@vertoz.com
```

# Description

Connects to Vertoz exchange for bids.
Vertoz Bidder adapter supports Banner ads.
Use bidder code ```vertoz``` for all Vertoz traffic.

# Test Parameters
```
var adUnits = [
   // Banner adUnit
   {
       code: 'banner-div',
       sizes: [[300, 250], [300,600]],   // a display size(s)
       bids: [{
         bidder: 'vertoz',
         params: {
           placementId: 'VZ-HB-B784382V6C6G3C'
         }
       }]
   },
];
```

