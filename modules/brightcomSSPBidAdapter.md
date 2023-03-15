# Overview

```
Module Name: Brightcom SSP Bid Adapter
Module Type: Bidder Adapter
Maintainer: alexandruc@brightcom.com
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
      bidder: 'bcmssp',
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
      bidder: 'bcmssp',
      params: {
        publisherId: 2141020
      }
    }]
  }
]
```
