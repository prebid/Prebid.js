# Overview

Module Name: The Grid Media Bidder Adapter
Module Type: Bidder Adapter
Maintainer: grid-tech@themediagrid.com

# Description

Module that connects to Grid demand source to fetch bids.

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "grid",
                       params: {
                           uid: '1',
                           priceType: 'gross' // by default is 'net'
                       }
                   }
               ]
           },{
               code: 'test-div',
               sizes: [[728, 90]],
               bids: [
                   {
                       bidder: "grid",
                       params: {
                           uid: 2,
                           priceType: 'gross'
                       }
                   }
               ]
           }
       ];
```