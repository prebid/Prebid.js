# Overview

Module Name: sspBC Bidder Adapter
Module Type: Bidder Adapter
Maintainer: wojciech.bialy@grupawp.pl

# Description

Module that connects to Wirtualna Polska Media header bidding endpoint to fetch bids.
Only banner format is supported.
Supported currencies: USD, EUR, PLN


Required parameters:


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
            id: '006',                          // required
            siteId: '235911',                   // required
            domain: 'somesite.pl',              // optional
            page: 'somesite.pl/somepage.html',  // optional
            tmax: 250                           // optional
         }
       }]
   }
];
```
