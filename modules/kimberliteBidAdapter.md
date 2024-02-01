# Overview

```markdown
Module Name: Kimberlite Bid Adapter
Module Type: Bidder Adapter
Maintainer: dev@solta.io
```

# Description

Kimberlite exchange adapter.

# Test Parameters

## Banner AdUnit

```javascript
var adUnits = [
  {
    code: 'test-div',
    mediaTypes: {
      banner: {
        sizes: [[320, 250], [640, 480]],
      }
    },
    bids: [
      {
        bidder: "kimberlite",
        params: {
          placementId: 'testBanner'
        }
      }
    ]
  }
]
```
