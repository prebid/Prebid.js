# Overview

**Module Name:** Screencore Bidder Adapter

**Module Type:** Bidder Adapter

**Maintainer:** connect@screencore.io

# Description

Module that connects to Screencore's SSP demand source via OpenRTB.

# Test Parameters

## SSP Integration

```js
var adUnits = [
  {
    code: "test-ad",
    sizes: [[300, 250]],
    bids: [
      {
        bidder: "screencore",
        params: {
          sspPlacementId: "123",
        },
      },
    ],
  },
];
```
