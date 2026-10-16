# Overview

```
Module Name: Motorik Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@motorik.io
```

# Description

Module that connects Prebid.js publishers to Motorik ad exchange via OpenRTB.

Supported media types: banner, video (VAST XML in `adm`), native.

Motorik accepts a single ad format per impression. If an ad unit declares several
formats, the first one in the order banner → video → native is requested.

Please contact support@motorik.io to get `accountId` and `placementId`.

# Bid Params

| Name          | Scope    | Description  | Example                              | Type     |
|---------------|----------|--------------|--------------------------------------|----------|
| `accountId`   | required | Account ID   | `'motorikTest'`                      | `string` |
| `placementId` | required | Placement ID | `'a7402708185f6a0c00700fd21c4260d2'` | `string` |

# Test Parameters

The parameters below always return a test bid.

```javascript
var adUnits = [
  {
    code: 'test-banner',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [{
      bidder: 'motorik',
      params: {
        accountId: 'motorikTest',
        placementId: 'a7402708185f6a0c00700fd21c4260d2'
      }
    }]
  },
  {
    code: 'test-video',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6]
      }
    },
    bids: [{
      bidder: 'motorik',
      params: {
        accountId: 'motorikTest',
        placementId: 'a7402708185f6a0c00700fd21c4260d2'
      }
    }]
  },
  {
    code: 'test-native',
    mediaTypes: {
      native: {
        ortb: {
          assets: [
            { id: 1, required: 1, title: { len: 90 } },
            { id: 2, required: 1, img: { type: 3, w: 300, h: 250 } },
            { id: 3, required: 0, data: { type: 2 } }
          ]
        }
      }
    },
    bids: [{
      bidder: 'motorik',
      params: {
        accountId: 'motorikTest',
        placementId: 'a7402708185f6a0c00700fd21c4260d2'
      }
    }]
  }
];
```
