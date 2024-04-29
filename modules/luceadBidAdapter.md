# Overview

Module Name: Lucead Bidder Adapter

Module Type: Bidder Adapter

Maintainer: prebid@lucead.com

# Description

Module that connects to Lucead demand source to fetch bids.

# Test Parameters
```
const adUnits = [
       {
           code: 'test-div',
           sizes: [[300, 250]],
           bids: [
               {
                   bidder: 'lucead',
                   params: {
                       placementId: '2',
                   }
               }
           ]
       }
   ];
```
