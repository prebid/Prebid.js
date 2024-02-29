# Overview

```
Module Name: OMS Bid Adapter
Module Type: Bidder Adapter
Maintainer: alexandruc@onlinemediasolutions.com
```

# Description

Online media solutions adapter integration to the Prebid library.

# Test Parameters

```
var adUnits = [
  {
    code: 'test-leaderboard',
    mediaTypes: {
      banner: {
        sizes: [[728, 90]]
      }
    },
    bids: [{
      bidder: 'oms',
      params: {
        publisherId: 2141020,
        bidFloor: 0.01
      }
    }]
  }, {
    code: 'test-banner',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [{
      bidder: 'oms',
      params: {
        publisherId: 2141020
      }
    }]
  }
]
```
