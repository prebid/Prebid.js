# Overview

Module Name: C1X Bidder Adapter
Module Type: Bidder Adapter
Maintainer: cathy@c1exchange.com

# Description

Module that connects to C1X's demand sources

# Test Parameters
```
  var adUnits = [
     {
         code: 'test-div',
         sizes: [[300, 600], [300, 250]],
         bids: [
             {
                 bidder: 'c1x',
                 params: {
                    siteId: '9999',
                    pixelId: '12345',
                    floorPriceMap: {
                      '300x250': 0.20,
                      '300x600': 0.30
                    }, //optional
                 }
             }
         ]
     },
   ];
```