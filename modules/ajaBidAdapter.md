# Overview

```
Module Name: Aja Bid adapter
Module Type: Bidder adapter
Maintainer: ssp_support@aja-kk.co.jp
```

# Description
Connects to Aja exchange for bids.
Aja bid adapter supports Banner.

# Test Parameters
```js
var adUnits = [
  // Banner adUnit
  {
    code: 'prebid_banner',
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250]
        ],
      }
    },
    bids: [{
      bidder: 'aja',
      params: {
        asi: 'tk82gbLmg'
      }
    }]
  }
];
```
