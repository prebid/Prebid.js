# Overview

Module Name: Sara Bidder Adapter
Module Type: Bidder Adapter
Maintainer: github@sara.media

# Description

Module that connects to Sara demand source to fetch bids.

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "sara",
                       params: {
                           uid: '5',
                           priceType: 'gross' // by default is 'net'
                       }
                   }
               ]
           },{
               code: 'test-div',
               sizes: [[728, 90]],
               bids: [
                   {
                       bidder: "sara",
                       params: {
                           uid: 6,
                           priceType: 'gross'
                       }
                   }
               ]
           }
       ];
```