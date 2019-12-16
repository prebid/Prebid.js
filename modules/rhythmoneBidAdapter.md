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
  code: 'adSlot-1',
  mediaTypes: {
      banner: {
          sizes: [
              [300, 250],
              [300, 600]
          ]
      }
  },
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
},
{
  code: 'adSlot-2',
  mediaTypes: {
    video: {
        context: "instream",
        playerSize: [640, 480]
    }
  },
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
