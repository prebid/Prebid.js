# Overview

```
Module Name:  Glimpse Protocol Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   hello@glimpseprotocol.io
```

# Description

This module connects publishers to Glimpse Protocol's demand sources via Prebid.js. Our innovative marketplace protects
consumer privacy while allowing precise targeting. It is compliant with GDPR, DPA and CCPA.

This adapter supports Banner.

# Test Parameters

```javascript
var adUnits = [
  {
    code: 'banner-div-a',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      },
    },
    bids: [
      {
        bidder: 'glimpse',
        params: {
          placementId: 'glimpse-demo-300x250',
        },
      },
    ],
  },
  {
    code: 'banner-div-b',
    mediaTypes: {
      banner: {
        sizes: [[320, 50]],
      },
    },
    bids: [
      {
        bidder: 'glimpse',
        params: {
          placementId: 'glimpse-demo-320x50',
        },
      },
    ],
  },
  {
    code: 'banner-div-c',
    mediaTypes: {
      banner: {
        sizes: [[970, 250]],
      },
    },
    bids: [
      {
        bidder: 'glimpse',
        params: {
          placementId: 'glimpse-demo-970x250',
        },
      },
    ],
  },
  {
    code: 'banner-div-d',
    mediaTypes: {
      banner: {
        sizes: [[728, 90]],
      },
    },
    bids: [
      {
        bidder: 'glimpse',
        params: {
          placementId: 'glimpse-demo-728x90',
        },
      },
    ],
  },
  {
    code: 'banner-div-e',
    mediaTypes: {
      banner: {
        sizes: [[300, 600]],
      },
    },
    bids: [
      {
        bidder: 'glimpse',
        params: {
          placementId: 'glimpse-demo-300x600',
        },
      },
    ],
  },
];
```
