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
    mediaTypes: {
        banner: {
            sizes: [[728, 90]],
        }
    },
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
    mediaTypes: {
        banner: {
            sizes: [[300, 250]],
        }
    },
    bids: [{
      bidder: 'sortable',
      params: {
        tagId: 'test-pb-banner',
        siteId: 'prebid.example.com'
      }
    }]
  }, {
    code: 'test-pb-sidebar',
    mediaTypes: {
        banner: {
            sizes: [[160, 600]],
        }
    },
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
  }, {
    code: 'test-pb-native',
    mediaTypes: {
      native: {
        title: {
          required: true,
          len: 800
        },
        image: {
          required: true,
          sizes: [790, 294],
        },
        sponsoredBy: {
          required: true
        }
      }
    },
    bids: [{
      bidder: 'sortable',
      params: {
        tagId: 'test-pb-native',
        siteId: 'prebid.example.com'
      }
    }]
  }, {
    code: 'test-pb-video',
    mediaTypes: {
      video: {
        playerSize: [640,480],
        context: 'instream'
      }
    },
    bids: [
      {
        bidder: 'sortable',
        params: {
          tagId: 'test-pb-video',
          siteId: 'prebid.example.com'
        }
      }
    ]
  }
]
```
