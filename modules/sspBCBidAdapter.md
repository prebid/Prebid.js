# Overview

Module Name: sspBC Bidder Adapter
Module Type: Bidder Adapter
Maintainer: wojciech.bialy@grupawp.pl

# Description

Module that connects to Wirtualna Polska Media header bidding endpoint to fetch bids.
Supports Banner, Video (instream) and Native formats 
Supported currencies: USD, EUR, PLN

Required parameters:
- none

Optional parameters:
- site id 
- adslot id
- publisher id
- domain
- page
- tmax
- test
- video

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
         bidder: 'sspBC',
         params: {
            id: "006",
            siteId: "235911",
            test: 1
         }
       }]
   }
];
```
