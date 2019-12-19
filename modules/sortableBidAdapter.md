# Overview

```
Module Name: Sortable Bid Adapter
Module Type: Bidder Adapter
Maintainer: prebid@sortable.com
```

# Description

Sortable's adapter integration to the Prebid library. Posts plain-text JSON to the /openrtb2/auction endpoint.

# Test Parameters

```
var adUnits = [
  {
    code: 'test-pb-leaderboard',
    sizes: [[728, 90]],
    bids: [{
      bidder: 'sortable',
      params: {
        tagId: 'test-pb-leaderboard',
        siteId: 'prebid.example.com',
        'keywords': {
          'key1': 'val1',
          'key2': 'val2'
        }
      }
    }]
  }, {
    code: 'test-pb-banner',
    sizes: [[300, 250]],
    bids: [{
      bidder: 'sortable',
      params: {
        tagId: 'test-pb-banner',
        siteId: 'prebid.example.com'
      }
    }]
  }, {
    code: 'test-pb-sidebar',
    size: [[160, 600]],
    bids: [{
      bidder: 'sortable',
      params: {
        tagId: 'test-pb-sidebar',
        siteId: 'prebid.example.com',
        'keywords': {
          'keyA': 'valA'
        }
      }
    }]
  }
]
```
