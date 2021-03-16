# Overview

```
Module Name: Sovrn Bid Adapter
Module Type: Bidder Adapter
Maintainer: jrosendahl@sovrn.com
```

# Description

Sovrn's adapter integration to the Prebid library. Posts plain-text JSON to the /rtb/bid endpoint.

# Test Parameters

```
var adUnits = [
  {
    code: 'test-leaderboard',
    sizes: [[728, 90]],
    bids: [{
      bidder: 'sovrn',
      params: {
        tagid: '403370',
        bidfloor: 0.01
      }
    }]
  }, {
    code: 'test-banner',
    sizes: [[300, 250]],
    bids: [{
      bidder: 'sovrn',
      params: {
        tagid: '403401'
      }
    }]
  }, {
    code: 'test-sidebar',
    size: [[160, 600]],
    bids: [{
      bidder: 'sovrn',
      params: {
        tagid: '531000'
      }
    }]
  }
]
```
