# Overview

Module Name: gopl Bidder Adapter
Module Type: Bidder Adapter
Maintainer: pawel.grudzien@grupawp.pl

# Description

Module that connects to WPartner/Gopl header bidding endpoint to fetch bids.
Supports Banner, Video (instream) and Native formats 
Supported currencies: USD, EUR, PLN

Required parameters:
- none

Optional parameters:
- site id 
- adslot id

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
         bidder: 'gopl',
         params: {
            id: "003",
            siteId: "237503",
         }
       }]
   }
];
```
