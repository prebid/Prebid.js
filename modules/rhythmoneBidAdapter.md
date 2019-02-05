# Overview

```
Module Name: RhythmOne Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@rhythmone.com
```

# Description

This module relays Prebid bids from Rhythm Exchange, RhythmOne's ad exchange.

# Test Parameters

```js
const adUnits = [{
  code: 'uuddlrlrbass',
  sizes: [
    [300, 250]
  ],
  bids: [
    {
      bidder: 'rhythmone',
      params: 
      { 
        placementId: '80184', // REQUIRED
        zone: '1r', // OPTIONAL
        path: 'mvo', // OPTIONAL
        endpoint: "//tag.1rx.io/rmp/80184/0/mvo?z=1r" // OPTIONAL, only required for testing.  this api guarantees no 204 responses
      }
    }
  ]
}];
```