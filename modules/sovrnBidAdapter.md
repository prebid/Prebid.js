# Overview

```
Module Name: Sovrn Bid Adapter
Module Type: Bidder Adapter
Maintainer: jrosendahl@sovrn.com
```

# Description

Sovrn's adapter integration to the Prebid library. Posts plain-text JSON to the /rtb/bid endpoint.

# Test Parameters
 
```js
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

# Video Test Parameters

```js
var videoAdUnit = {
  code: 'video1',
  sizes: [640, 480],
  mediaTypes: {
    video: {
      context: 'instream',
      playerSize: [640, 480],
      mimes: ['video/mp4'],
      protocols: [1, 2, 3, 4, 5, 6, 7, 8],
      playbackmethod: [2],
      skip: 1,
    },
  },
  bids: [
    {
      bidder: 'sovrn',
      // Prebid Server Bidder Params https://docs.prebid.org/dev-docs/pbs-bidders.html#sovrn
      params: {
        tagid: '315045',
        bidfloor: '0.04',
      },
    },
  ],
}
```
