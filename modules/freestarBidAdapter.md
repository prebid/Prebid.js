# Overview

```
Module Name: Freestar Bid Adapter
Module Type: Bidder Adapter
Maintainer: prebid@freestar.com
```

# Description

Freestar's adapter integration to the Prebid library. Posts plain-text JSON to the /openrtb2/auction endpoint.

# Test Parameters

```
var adUnits = [{
                code: 'test-pb-leaderboard',
                mediaTypes: {
                  banner: {
                    sizes: [[728, 90]],
                  }
                },
                bids: [{
                  bidder: 'freestar',
                  params: {
                    tagId: 'test-pb-leaderboard',
                    siteId: 'prebid.example.com',
                    'keywords': {
                      'key1': 'val1',
                      'key2': 'val2'
                    }
                  }
                }]
              }]
```
