# Overview

```
Module Name:  YieldNexus Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   rtbops@yieldnexus.com
```

# Description

Adds support to query the YieldNexus platform for bids. The YieldNexus platform supports banners & video.

Only one parameter is required: `spid`, which provides your YieldNexus account number.

# Test Parameters
```
var adUnits = [
   // Banner:
   {
     code: 'banner-ad-unit',
     sizes: [[300, 250]],
     bids: [{
       bidder: 'yieldnexus',
       params: {
         spid: '1253',      // your supply ID in your YieldNexus dashboard
         bidfloor: 0.03,    // an optional custom bid floor
         adpos: 1,          // ad position on the page (optional)
         instl: 0           // interstitial placement? (0 or 1, optional)
       }
     }]
   },
   // Outstream video:
   {
     code: 'video-ad-unit',
     sizes: [[640, 480]],
     mediaTypes: {
       video: {
         context: 'outstream',
         playerSize: [640, 480]
       }
     },
     bids: [ {
       bidder: 'yieldnexus',
       params: {
         spid: '1254',      // your supply ID in your YieldNexus dashboard
         bidfloor: 0.03,    // an optional custom bid floor
         adpos: 1,          // ad position on the page (optional)
         instl: 0           // interstitial placement? (0 or 1, optional)
       }
     }]
   }
];
```
