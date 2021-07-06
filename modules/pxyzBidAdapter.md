# Overview

```
Module Name:  Playground XYZ Bid Adapter
Module Type:  Bidder Adapter
Maintainer: tech+prebid@playgroundxyz.com
```

# Description

Connects to the Playground XYZ marketplace for demand.

This bid adapter supports the Banner media type only.

# Test Parameters

```js
var adUnits = [
  // Banner adUnit
  {
    code: 'div-gpt-ad-1460505748561-0',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      }
    },
    sizes: [[300, 250]],
    bids: [{
      bidder: 'pxyz',
      params: {
        placementId: '13473562'
      }
    }]
  }
];
```

