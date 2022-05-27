# Overview

```
Module Name: Bidfluence Adapter
Module Type: Bidder Adapter
Maintainer: integrations@bidfluence.com
prebid_1_0_supported : true
gdpr_supported: true
```

# Description

Bidfluence adapter for prebid.

# Test Parameters

```
var adUnits = [
  {
    code: 'test-prebid',
    sizes: [[300, 250]],
    bids: [{
      bidder: 'bidfluence',
      params: {
        placementId: '1000',
        publisherId: '1000'
      }
    }]
  }
]
```
