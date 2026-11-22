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

# Storage

The adapter's user-sync iframe (`getUserSyncs`) relays a cross-domain sync id ("stac")
back to the page via `postMessage`; when present, it is written to local storage under
the key `bc_stac` (`BCID_STORAGE_NAME`) and reused on subsequent auctions as `user.stac`
in the bid request. This is a first-party identifier scoped to the bidder's own storage
manager (`getStorageManager({ bidderCode: 'gopl' })`).

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