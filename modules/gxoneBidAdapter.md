# Overview

Module Name: GXOne Bidder Adapter
Module Type: Bidder Adapter
Maintainer: olivier@geronimo.co

# Description

Module that connects to GXOne demand source to fetch bids.

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "gxone",
                       params: {
                           uid: '2',
                           priceType: 'gross' // by default is 'net'
                       }
                   }
               ]
           },{
               code: 'test-div',
               sizes: [[728, 90]],
               bids: [
                   {
                       bidder: "gxone",
                       params: {
                           uid: 9,
                           priceType: 'gross'
                       }
                   }
               ]
           }
       ];
```