# Overview
 
```
Module Name: interactiveOffers Bidder Adapter
Module Type: Bidder Adapter
Maintainer: dev@interactiveoffers.com
```

# Description

Module that connects to interactiveOffers demand sources. Param partnerId is required.

# Test Parameters
```
    var adUnits = [
           {
               code: 'interactiveOffers-slot',
               mediaTypes: {
                   banner: {
                       sizes: [[300, 250]]
                   }
               },
               bids: [
                   {
                       bidder: "interactiveOffers",
                       params: {
                           partnerId: "abcd1234",
                           tmax: 250
                       }
                   }
               ]
           }
       ];
```
