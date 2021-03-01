# Overview

Module Name: Converge Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@converge-digital.com

# Description

Module that connects to Converge demand source to fetch bids.
Converge Bid Adapter supports Banner and Video (instream and outstream).

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "converge",
                       params: {
                           uid: '59',
                           priceType: 'gross' // by default is 'net'
                       }
                   }
               ]
           },{
               code: 'test-div',
               sizes: [[728, 90]],
               bids: [
                   {
                       bidder: "converge",
                       params: {
                           uid: 1,
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
                       bidder: "converge",
                       params: {
                           uid: 60
                       }
                   }
               ]
           }
       ];
```
