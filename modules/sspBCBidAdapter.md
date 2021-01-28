# Overview

Module Name: sspBC Bidder Adapter
Module Type: Bidder Adapter
Maintainer: wojciech.bialy@grupawp.pl

# Description

Module that connects to Wirtualna Polska Media header bidding endpoint to fetch bids.
Only banner format is supported.
Supported currencies: USD, EUR, PLN

Required parameters:
- none

Optional parameters:
- site id 
- adslot id
- domain
- page
- tmax
- bidFloor

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
         bidder: 'sspBC',
         params: {
            id: '006',                          // optional
            siteId: '235911',                   // optional
            domain: 'somesite.pl',              // optional
            page: 'somesite.pl/somepage.html',  // optional
            tmax: 250,                          // optional
            bidFloor: 0.1                       // optional
         }
       }]
   }
];
```
