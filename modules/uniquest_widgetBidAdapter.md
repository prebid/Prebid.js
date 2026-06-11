# Overview

```
Module Name: UNIQUEST Widget Bid Adapter
Module Type: Bidder Adapter
Maintainer:  prebid_info@muneee.co.jp
```

# Description
Connects to UNIQUEST exchange for bids.

# Test Parameters
```js
var adUnits = [
  // Banner adUnit
  {
    code: 'test-div',
    mediaTypes: {
      banner: {
        sizes: [
          [1, 1],
        ]
      }
    },
    bids: [{
      bidder: 'uniquest_widget',
      params: {
        wid: 'skDT3WYk',
      }
    }]
  }
];
```
