# Overview

```
Module Name: Alkimi Bidder Adapter
Module Type: Bidder Adapter
Maintainer: kalidas@alkimiexchange.com
```

# Description

Connects to Alkimi Bidder for bids.
Alkimi bid adapter supports Banner and Video ads.

# Test Parameters
```
const adUnits = [
  {
    bids: [
      {
          bidder: 'alkimi',
          params: {
              bidFloor: 0.1,
              token: '?????????????????????', // Publisher Token provided by Alkimi
          }
      }
    ]
  }
];
```
