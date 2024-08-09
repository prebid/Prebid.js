# Overview

**Module Name**: AdSpirit Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: prebid@adspirit.de

# Description

Module that connects to an AdSpirit zone to fetch bids. 

# Test Parameters
```
    var adUnits = [
           {
               code: 'display-div',
               sizes: [[300, 250]],  // a display size
               bids: [
                   {
                       bidder: "adspirit",
                       params: {
                           placementId: '5',
                           host: 'n1test.adspirit.de'
                       }
                   }
               ]
           }
       ];
```
