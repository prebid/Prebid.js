# Overview

Module Name: TrustX Bidder Adapter
Module Type: Bidder Adapter
Maintainer: paul@trustx.org

# Description

Module that connects to TrustX demand source to fetch bids.
TrustX Bid Adapter supports Banner and Video (instream and outstream).

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "trustx",
                       params: {
                           uid: '44',
                           priceType: 'gross' // by default is 'net'
                       }
                   }
               ]
           },{
               code: 'test-div',
               sizes: [[728, 90]],
               bids: [
                   {
                       bidder: "trustx",
                       params: {
                           uid: 45,
                           priceType: 'gross',
                           keywords: {
                               brandsafety: ['disaster'],
                               topic: ['stress', 'fear']
                           }
                       }
                   }
               ]
           },{
               code: 'test-div',
               sizes: [[640, 360]],
               mediaTypes: { video: {} },
               bids: [
                   {
                       bidder: "trustx",
                       params: {
                           uid: 7697
                       }
                   }
               ]
           }
       ];
```