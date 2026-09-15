# Overview

```
Module Name: Advertronic Bidder Adapter
Module Type: Bidder Adapter
Maintainer: info@advertronic.io
```

# Description

Module that connects to Advertronic SSP for bids. Supports banner and video
(outstream with an own renderer, instream returns VAST XML). Prices are
returned net to the publisher in RUB — use the currency module (or set
`adServerCurrency: "RUB"`) if your ad server currency differs.

Both `publisherId` and `placementId` are issued during onboarding
(info@advertronic.io).

# Test Parameters

```
var adUnits = [
  // Banner
  {
    code: 'test-banner-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [{
      bidder: 'advertronic',
      params: {
        publisherId: '1',
        placementId: 'prebidtest0001'
      }
    }]
  },
  // Video (outstream)
  {
    code: 'test-video-div',
    mediaTypes: {
      video: {
        context: 'outstream',
        playerSize: [640, 360],
        mimes: ['video/mp4']
      }
    },
    bids: [{
      bidder: 'advertronic',
      params: {
        publisherId: '1',
        placementId: 'prebidtest0001'
      }
    }]
  }
];
```
