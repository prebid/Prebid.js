# Overview

Module Name: Adlive Plus Bidder Adapter

Module Type: Bidder Adapter

Maintainer: support@adlive.io

# Description

Module that connects to Adlive plus demand source to fetch bids.

# Test Parameters
```
const adUnits = [
       {
           code: 'test-div',
           sizes: [[300, 250]],
           bids: [
               {
                   bidder: 'adliveplus',
                   params: {
                       placementId: '1',
                   }
               }
           ]
       }
   ];
```
