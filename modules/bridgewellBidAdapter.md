# Overview

Module Name: Bridgewell Bidder Adapter
Module Type: Bidder Adapter
Maintainer: kuchunchou@bridgewell.com

# Description

Module that connects to Bridgewell demand source to fetch bids.

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: 'bridgewell',
                       params: {
                           ChannelID: 'CgUxMjMzOBIBNiIFcGVubnkqCQisAhD6ARoBOQ'
                       }
                   }
               ]
           },{
               code: 'test-div',
               sizes: [[728, 90]],
               bids: [
                   {
                       bidder: 'bridgewell',
                       params: {
                           ChannelID: 'CgUxMjMzOBIBNiIGcGVubnkzKggI2AUQWhoBOQ',
                           cpmWeight: 1.5
                       }
                   }
               ]
           }
       ];
```
