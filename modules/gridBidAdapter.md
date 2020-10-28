# Overview

Module Name: The Grid Media Bidder Adapter
Module Type: Bidder Adapter
Maintainer: grid-tech@themediagrid.com

# Description

Module that connects to Grid demand source to fetch bids.
Grid bid adapter supports Banner and Video (instream and outstream).

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
                           priceType: 'gross',
                           keywords: {
                               brandsafety: ['disaster'],
                               topic: ['stress', 'fear']
                           }
                       }
                   }
               ]
           },
           {
               code: 'test-div',
               sizes: [[728, 90]],
               mediaTypes: { video: {} },
               bids: [
                   {
                       bidder: "grid",
                       params: {
                           uid: 11
                       }
                   }
               ]
          }
       ];
```
