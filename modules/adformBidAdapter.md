# Overview

Module Name: Adform Bidder Adapter
Module Type: Bidder Adapter
Maintainer: Scope.FL.Scripts@adform.com

# Description

Module that connects to Adform demand sources to fetch bids.
Banner and video formats are supported.

# Test Parameters
```
    var adUnits = [
           {
               code: 'div-gpt-ad-1460505748561-0',
               sizes: [[300, 250], [250, 300], [300, 600], [600, 300]],  // a display size
               bids: [
                   {
                       bidder: "adform",
                       params: {
                           adxDomain: 'adx.adform.net', //optional
                           mid: '292063',
                           priceType: 'net' // default is 'gross'
                       }
                   }
               ]
           },
       ];
```
