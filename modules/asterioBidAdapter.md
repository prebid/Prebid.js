# Overview

```
Module Name: Asterio Bidder Adapter
Module Type: Bidder Adapter
Maintainer: mnikulin@asteriosoft.com
```

# Description

Connects to Asterio Bidder for bids.
Asterio bid adapter supports Banner and Video ads.

# Test Parameters
```
const adUnits = [
  {
    bids: [
      {
        bidder: 'asterio',
        params: {
          adUnitToken: '????????-????-????-????-????????????', // adUnitToken provided by Asterio
          endpoint: 'https://bid.asterio.ai/prebid/bid'
        }
      }
    ]
  }
];
```
