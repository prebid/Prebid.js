# Overview

```
Module Name:  MediaSquare Bid Adapter
Module Type:  Bidder Adapter
Maintainer: tech@mediasquare.fr
```

# Description

Connects to Mediasquare network for bids.

Mediasquare bid adapter supports Banner only for the time being.

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
         bidder: 'mediasquare',
         params: {
            owner: "test",
            code: "publishername_atf_desktop_rg_pave"
         }
       }]
   },
];
```
