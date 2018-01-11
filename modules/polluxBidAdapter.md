# Overview

**Module Name**: Pollux Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: tech@polluxnetwork.com

# Description

Module that connects to Pollux Network LLC demand source to fetch bids.
All bids will present CPM in EUR (Euro).

# Test Parameters
```
    var adUnits = [{
      code: '34f724kh32',
      sizes: [[300, 250]], // a single size
      bids: [{
          bidder: 'pollux',
          params: {
              zone: '1806' // a single zone
          }
      }]
    },{
      code: '34f789r783',
      sizes: [[300, 250], [728, 90]], // multiple sizes
      bids: [{
          bidder: 'pollux',
          params: {
              zone: '1806,276' // multiple zones, max 5
          }
      }]
    }];
```
