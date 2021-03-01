# Overview

```
Module Name: APAC Digital Exchange Bidder Adapter
Module Type: Bidder Adapter
Maintainer: ken@apacdex.com
```

# Description

Connects to APAC Digital Exchange for bids.
Apacdex bid adapter supports Banner and Video (Instream and Outstream) ads.

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
          bidder: 'apacdex',
          params: {
              siteId: 'apacdex1234', // siteId provided by Apacdex
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
      bidder: 'apacdex',
      params: {
        siteId: 'apacdex1234', // siteId provided by Apacdex
      }
    }
  ]
};
```