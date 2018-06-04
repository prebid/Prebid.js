# Overview

Module Name: Freewheel SSP Bidder Adapter
Module Type: Bidder Adapter
Maintainer: clientsidesdk@freewheel.tv

# Description

Module that connects to Freewheel ssp's demand sources

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],  // a display size
               bids: [
                   {
                       bidder: "freewheel-ssp",
                       params: {
                           zoneId : '277225'
                       }
                   }
               ]
           }
       ];
```