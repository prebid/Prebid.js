# Overview

```
Module Name: Aja Bid adapter
Module Type: Bidder adapter
Maintainer:
```

# Description
Connects to Aja exchange for bids.
Aja bid adapter supports Banner and Outstream Video.

# Test Parameters
```
var adUnits = [
   // Banner adUnit
   {
       code: 'banner-div',
       sizes: [[300, 250]],
       bids: [{
         bidder: 'aja',
         params: {
           asi: ''
         }
       }]
   },
   // Video outstream adUnit
   {
     code: 'video-outstream',
     sizes: [[640, 480]],
     mediaTypes: {
       video: {
         context: 'outstream'
       }
     },
     bids: [
       {
         bidder: 'aja',
         params: {
           asi: ''
         }
       }
     ]
   }
];
```
