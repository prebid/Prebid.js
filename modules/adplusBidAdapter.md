# Overview

Module Name: AdPlus Bidder Adapter

Module Type: Bidder Adapter

Maintainer: adplus.destek@yaani.com.tr

# Description

AdPlus Prebid.js Bidder Adapter. Only banner formats are supported.

About us : https://ssp.ad-plus.com.tr/

# Test Parameters

```javascript
var adUnits = [
  {
    code: "div-adplus",
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250],
        ],
      },
    },
    bids: [
      {
        bidder: "adplus",
        params: {
          inventoryId: "-1",
          adUnitId: "-3",
        },
      },
    ],
  },
];
```
