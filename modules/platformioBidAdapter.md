# Overview

**Module Name**: Platform.io Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: sk@ultralab.by

# Description

Connects to Platform.io demand source to fetch bids.
Please use ```platformio``` as the bidder code.

# Test Parameters
```
    var adUnits = [{
      code: 'banner-ad-div',
      sizes: [[300, 250]],
      bids: [{
          bidder: 'platformio',
          params: { 
            pubId: '28082',
            siteId: '26047',
            placementId: '123',
            size: '250X250'
          }
      }]
    }];
```
