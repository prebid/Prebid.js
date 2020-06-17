# Overview

```
Module Name: Valueimpression Bidder Adapter
Module Type: Bidder Adapter
Maintainer: k.vision@valueimpression.com
```

# Description

Module that connects to Valueimpression's exchange for bids.
Valueimpression Bidder adapter supports Banner and Video ads.

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
          bidder: 'valueimpression',
          params: {
              siteId: 'vi-site-id', // siteId provided by Valueimpression
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
      bidder: 'valueimpression',
      params: {
        siteId: 'vi-site-id', // siteId provided by Valueimpression
      }
    }
  ]
};
```