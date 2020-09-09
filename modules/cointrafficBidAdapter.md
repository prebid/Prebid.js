# Overview

```
Module Name: Cointraffic Bidder Adapter
Module Type: Cointraffic Adapter
Maintainer: tech@cointraffic.io
```

# Description
The Cointraffic client module makes it easy to implement Cointraffic directly into your website. To get started, simply replace the ``placementId`` with your assigned tracker key. This is dependent on the size required by your account dashboard. For additional information on this module, please contact us at ``support@cointraffic.io``.

# Test Parameters
```
  var adUnits = [{
    code: 'test-ad-div',
    mediaTypes: {
        banner: {
            sizes: [[300, 250]],
        }
    },
    bids: [{
    bidder: 'cointraffic',
      params: { 
        placementId: 'testPlacementId'
      }
    }]
  }];
```
