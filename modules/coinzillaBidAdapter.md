# Overview

```
Module Name: Coinzilla Bidder Adapter
Module Type: Coinzilla Adapter
Maintainer: technical@sevio.com
```

# Description

Our module helps you have an easier time implementing Coinzilla on your website. All you have to do is replace the ``placementId`` with your zoneID, depending on the required size in your account dashboard. If you need additional information please contact us at ``publishers@coinzilla.com``.
# Test Parameters
```
  var adUnits = [{
    code: 'test-ad-div',
    sizes: [[300, 250]],
    bids: [{
    bidder: 'coinzilla',
      params: { 
        placementId: 'testPlacementId'
      }
    }]
  }];
```