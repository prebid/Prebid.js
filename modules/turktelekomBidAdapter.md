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
               mediaTypes: {
                   banner: {
                       sizes: [[300, 250], [300,600]]
                   }
               },
               bids: [
                   {
                       bidder: "turktelekom",
                       params: {
                           uid: 17,
                           priceType: 'gross' // by default is 'net'
                       }
                   }
               ]
           },{
               code: 'test-div',
               mediaTypes: {
                   video: {
                       playerSize: [[640, 360]],
                       context: 'instream'
                   }
               },
               bids: [
                   {
                       bidder: "turktelekom",
                       params: {
                           uid: 19
                       }
                   }
               ]
           }
       ];
```