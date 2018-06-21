# Overview

```
Module Name: Sharethrough Bidder Adapter
Module Type: Bidder Adapter
Maintainer: jchau@sharethrough.com && cpan@sharethrough.com
```

# Description

Module that connects to Sharethrough's demand sources

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[1, 1]],  // a display size
               bids: [
                   {
                       bidder: "sharethrough",
                       params: {
                           pkey: 'LuB3vxGGFrBZJa6tifXW4xgK'
                       }
                   }
               ]
           },{
               code: 'test-div',
               sizes: [[300,250], [1, 1]],   // a mobile size
               bids: [
                   {
                       bidder: "sharethrough",
                       params: {
                           pkey: 'LuB3vxGGFrBZJa6tifXW4xgK',
                           iframe: true
                       }
                   }
               ]
           }
       ];
```