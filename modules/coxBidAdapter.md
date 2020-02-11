# Overview

```
Module Name: Cox/COMET Bid Adapter
Module Type: Bidder Adapter
Maintainer: reynold@coxds.com
```

# Description

Cox/COMET's adapter integration to the Prebid library.

# Test Parameters

```
var adUnits = [
  {
    code: 'test-leaderboard',
    sizes: [[728, 90]],
    bids: [{
      bidder: 'cox',
      params: {
        size: '728x90',
        id: 2000005991607,
        siteId: 2000100948180,
      }
    }]
  }, {
    code: 'test-banner',
    sizes: [[300, 250]],
    bids: [{
      bidder: 'cox',
      params: {
        size: '300x250',
        id: 2000005991707,
        siteId: 2000100948180,
      }
    }]
  }
]
```