# Overview

```
Module Name: NAF Digital Bid Adapter
Module Type: Bidder Adapter
Maintainer: vyatsun@gmail.com
```

# Description

NAF Digital adapter integration to the Prebid library.

# Test Parameters

```
var adUnits = [
  {
    code: 'test-leaderboard',
    sizes: [[728, 90]],
    bids: [{
      bidder: 'nafdigital',
      params: {
          publisherId: 2141020,
          bidFloor: 0.01
      }
    }]
  }, {
    code: 'test-banner',
    sizes: [[300, 250]],
    bids: [{
      bidder: 'nafdigital',
      params: {
        publisherId: 2141020
      }
    }]
  }
]
```
