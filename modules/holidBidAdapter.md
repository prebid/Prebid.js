# Overview

```
Module Name: Holid Bid Adapter
Module Type: Bidder Adapter
Maintainer: richard@holid.se
```

# Description

Currently module supports only banner mediaType.

# Test Parameters

## Sample Banner Ad Unit

```js
var adUnits = [
  {
    code: 'bannerAdUnit',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      },
    },
    bids: [
      {
        bidder: 'holid',
        params: {
          adUnitID: '12345',
        },
      },
    ],
  },
]
```
