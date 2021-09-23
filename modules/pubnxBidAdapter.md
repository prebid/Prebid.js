# Overview

```
Module Name:  PubNX Bidder Adapter
Module Type:  Bidder Adapter
Maintainer: prebid-team@pubnx.com
```

# Description

Connects to PubNX exchange for bids.
PubNX Bidder adapter supports Banner ads.
Use bidder code ```pubnx``` for all PubNX traffic.

# Test Parameters
```
var adUnits = [
   // Banner adUnit
   {
       code: 'banner-div',
       sizes: [[300, 250], [300,600]],   // a display size(s)
       bids: [{
         bidder: 'pubnx',
         params: {
           placementId: 'PNX-HB-G396432V4809F3'
         }
       }]
   },
];
```

