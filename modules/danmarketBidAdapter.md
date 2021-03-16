# Overview

Module Name: Dentsu Aegis Network Marketplace Bidder Adapter
Module Type: Bidder Adapter
Maintainer: niels@baarsma.net

# Description

Module that connects to DAN Marketplace demand source to fetch bids.

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "danmarket",
                       params: {
                           uid: '4',
                           priceType: 'gross' // by default is 'net'
                       }
                   }
               ]
           },{
               code: 'test-div',
               sizes: [[728, 90]],
               bids: [
                   {
                       bidder: "danmarket",
                       params: {
                           uid: 5,
                           priceType: 'gross'
                       }
                   }
               ]
           }
       ];
```