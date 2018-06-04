# Overview

```
Module Name: RhythmOne Bidder Adapter
Module Type: Bidder Adapter
Maintainer: astocker@rhythmone.com
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
        placementId: '411806',
        endpoint: "//tag.1rx.io/rmp/72721/0/mvo?z=1r" // only required for testing.  this api guarantees no 204 responses
      }
    }
  ]
}];
```