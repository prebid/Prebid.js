# Overview

Module Name: Türk Telekom Bidder Adapter
Module Type: Bidder Adapter
Maintainer: turktelssp@gmail.com

# Description

Module that connects to Türk Telekom demand source to fetch bids.
Türk Telekom Bid Adapter supports Banner and Video (instream and outstream).

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "turktelekom",
                       params: {
                           uid: '17',
                           priceType: 'gross' // by default is 'net'
                       }
                   }
               ]
           },{
               code: 'test-div',
               sizes: [[640, 360]],
               mediaTypes: { video: {} },
               bids: [
                   {
                       bidder: "turktelekom",
                       params: {
                           uid: 7697
                       }
                   }
               ]
           }
       ];
```