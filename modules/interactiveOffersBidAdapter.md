# Overview

```
Module Name: interactiveOffers Bidder Adapter
Module Type: Bidder Adapter
Maintainer: devteam@interactiveoffers.com
```

# Description

Module that connects to interactiveOffers demand sources. Param pubId is required.

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
                           pubId: '10',
                           tmax: 5000
                       }
                   }
               ]
           }
       ];
```