# Overview

```
Module Name: Quantum Digital Exchange Bidder Adapter
Module Type: Bidder Adapter
Maintainer: ken@quantumdex.io
```

# Description

Connects to Quantum Digital Exchange for bids.
Quantumdex bid adapter supports Banner and Video (Instream and Outstream) ads.

# Test Parameters
```
var adUnits = [
  {
    code: 'test-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300,600]]
      }
    },
    bids: [
      {
          bidder: 'quantumdex',
          params: {
              siteId: 'quantumdex-site-id', // siteId provided by Quantumdex
          }
      }
    ]
  }
];
```

# Video Test Parameters
```
var videoAdUnit = {
  code: 'test-div',
  sizes: [[640, 480]],
  mediaTypes: {
    video: {
      playerSize: [[640, 480]],
      context: 'instream'
    },
  },
  bids: [
    {
      bidder: 'quantumdex',
      params: {
        siteId: 'quantumdex-site-id', // siteId provided by Quantumdex
      }
    }
  ]
};
```