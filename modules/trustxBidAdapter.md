# Overview

Module Name: TrustX Bidder Adapter
Module Type: Bidder Adapter
Maintainer: paul@trustx.org

# Description

Module that connects to TrustX demand source to fetch bids.

# Test Parameters
```
    window.globalPrebidTrustxPriceType = 'gross'; // by default is 'net'
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "trustx",
                       params: {
                           uid: '44'
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
                           uid: 45
                       }
                   }
               ]
           }
       ];
```