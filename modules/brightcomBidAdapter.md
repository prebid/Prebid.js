# Overview

```
Module Name: Brightcom Bid Adapter
Module Type: Bidder Adapter
Maintainer: vladislavy@brightcom.com
```

# Description

Brightcom's adapter integration to the Prebid library.

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
      bidder: 'brightcom',
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
      bidder: 'brightcom',
      params: {
        publisherId: 2141020
      }
    }]
  }
]
```
