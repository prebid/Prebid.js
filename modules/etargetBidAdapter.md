# Overview

```
Module Name: ETARGET Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@etarget.sk
```

# Description

Module that connects to ETARGET demand sources to fetch bids.
Banner and video formats are supported.

# Test Parameters
```
    var adUnits = [
           {
               code: 'div-gpt-ad-1460505748561-0', // ID of elemnt where ad will be shown
               sizes: [[300, 250], [300, 300], [300, 600], [160, 600]],  // a display size
               bids: [
                   {
                       bidder: "etarget",
                       params: {
                           country: 1, // required; available country values: 1 (SK), 2 (CZ), 3 (HU), 4 (RO), 5 (RS), 6 (BG), 7 (PL), 8 (HR), 9 (AT), 11 (DE), 255 (EN)
                           refid: '12345' // required; this ID is available in your publisher dashboard at https://partner.etarget.sk/
                       }
                   }
               ]
           }
       ];
```
