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
        sizes: [[320, 250], [640, 480]], // Required.
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

## Video AdUnit

```javascript
var adUnits = [
  {
    code: 'test-div',
    mediaTypes: {
      video: {
        // ORTB 2.5 options.
        mimes: ['video/mp4'], // Required.
        // Other options are optional.
        placement: 1,
        protocols: [3, 6],
        linearity: 1,
        startdelay: 0
      }
    },
    bids: [
      {
        bidder: "kimberlite",
        params: {
          placementId: 'testVideo'
        }
      }
    ]
  }
]
```
