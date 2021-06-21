# Overview

```
Module Name: Onomagic Bid Adapter
Module Type: Bidder Adapter
Maintainer: vyatsun@gmail.com
```

# Description

Onomagic's adapter integration to the Prebid library.

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
      bidder: 'onomagic',
      params: {
        publisherId: 20167,
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
      bidder: 'onomagic',
      params: {
        publisherId: 20167
      }
    }]
  }
]
```
