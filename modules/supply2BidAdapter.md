# Overview

Module Name: Supply2 Bidder Adapter
Module Type: Bidder Adapter
Maintainer: vishal@mediadonuts.com

# Description

Module that connects to Media Donuts demand source to fetch bids.

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "supply2",
                       params: {
                           uid: '23',
                           priceType: 'gross' // by default is 'net'
                       }
                   }
               ]
           },{
               code: 'test-div',
               sizes: [[728, 90]],
               bids: [
                   {
                       bidder: "supply2",
                       params: {
                           uid: 24,
                           priceType: 'gross'
                       }
                   }
               ]
           }
       ];
```