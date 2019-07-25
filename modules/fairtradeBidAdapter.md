# Overview

Module Name: FairTrade Bidder Adapter
Module Type: Bidder Adapter
Maintainer: Tammy.l@VaticDigital.com

# Description

Module that connects to FairTrade demand source to fetch bids.

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "fairtrade",
                       params: {
                           uid: '166',
                           priceType: 'gross' // by default is 'net'
                       }
                   }
               ]
           }
       ];
```