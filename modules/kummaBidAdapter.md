# Overview

**Module Name**: Kumma Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: 

# Description

Connects to Kumma demand source to fetch bids.
Please use ```kumma``` as the bidder code.

# Test Parameters
```
    var adUnits = [{
      code: 'banner-ad-div',
      sizes: [[250, 250]],
      bids: [{
          bidder: 'kumma',
          params: { 
            pubId: '28082',
            siteId: '26047',
            placementId: '123',
            size: '250X250'
          }
      }]
    }];
```
