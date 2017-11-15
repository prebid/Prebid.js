# Overview

**Module Name**: Kumma Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: yehonatan@kumma.com

# Description

Connects to Kumma demand source to fetch bids.
Please use ```kumma``` as the bidder code.

# Test Parameters
```
    var adUnits = [{
      code: 'banner-ad-div',
      sizes: [[300, 250]],
      bids: [{
          bidder: 'kumma',
          params: { 
            pubId: '55879', // required
            siteId: '26047', // required
            size: '300X250', // required
            placementId: '123',
            bidFloor: '0.001'
          }
      }]
    }];
```
