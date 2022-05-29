# Overview

```
Module Name:  IncrementX Bidder Adapter
Module Type:  Bidder Adapter
Maintainer: prebid-team@vertoz.com
```

# Description

Connects to IncrementX exchange for bids.
IncrementX Bidder adapter supports Banner ads.
Use bidder code ```incrementx``` for all IncrementX traffic.

# Test Parameters
```
var adUnits = [
   // Banner adUnit
   {
       code: 'banner-div',
       sizes: [[300, 250], [300,600]],   // a display size(s)
       bids: [{
         bidder: 'incrementx',
         params: {
           placementId: 'PNX-HB-F796830VCF3C4B'
         }
       }]
   },
];
```

