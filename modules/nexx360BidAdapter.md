# Overview

```
Module Name:  Nexx360 Bid Adapter
Module Type:  Bidder Adapter
Maintainer: gabriel@nexx360.io
```

# Description

Connects to Nexx360 network for bids.

Nexx360 bid adapter supports Banner only for the time being.

# Test Parameters
```
var adUnits = [
   // Banner adUnit
   {
      code: 'banner-div',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300,600]]
        }
      },
      bids: [{
         bidder: 'nexx360',
         params: {
            account: '1067',
            tagId: 'luvxjvgn'
         }
       }]
   },
];
```
