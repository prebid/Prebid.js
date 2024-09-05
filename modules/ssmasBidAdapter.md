# Overview

Module Name: SSMas Bidder Adapter
Module Type: Bidder Adapter
Maintainer: hzchen.work@gmail.com

# Description

Module that connects to Sem Seo & Mas header bidding endpoint to fetch bids.
Supports Banner
Supported currencies: EUR

Required parameters:
- placement id

# Test Parameters
```
var adUnits = [
   // Banner adUnit
   {
      code: 'banner-div',
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      bids: [{
         bidder: 'ssmas',
         params: {
            placementId: "10336"
         }
       }]
   }
];
```
