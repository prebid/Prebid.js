# Overview

```
Module Name:  Glimpse Protocol Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   publisher@glimpseprotocol.io
```

# Description

This module connects publishers to Glimpse Protocol's demand sources via Prebid.js. Our innovative marketplace protects
consumer privacy while allowing precise targeting. It is compliant with GDPR, DPA and CCPA.

The Glimpse Adapter supports banner formats.

# Test Parameters

```javascript
const adUnits = [
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
          pid: 'e53a7f564f8f44cc913b',
        },
      },
    ],
  },
];
```
