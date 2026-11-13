---
layout: bidder
title: Realry
description: Prebid Realry Bidder Adapter
biddercode: realry
tcfeu_supported: false
usp_supported: true
gpp_supported: true
schain_supported: true
userId: all
media_types: banner, native
safeframes_ok: true
floors_supported: true
pbjs: true
pbs: true
---

### Overview

```
Module Name: Realry Bid Adapter
Module Type: Bidder Adapter
Maintainer: steve@realry.com
```

### Description

The Realry Bid Adapter connects Prebid.js to the Realry commerce DSP — a
luxury-fashion product-listing demand source. The adapter is built on
`ortbConverter`, so it forwards standard OpenRTB signals (sizes, price floors,
user IDs, supply chain, consent: USP, GPP) automatically derived from the ad
unit and `ortb2`.

Realry supports **banner** and **native** (Native 1.2). Banner responses are
HTML markup wrapping a product image inside a click anchor; native responses
are a Native 1.2 admObject with title, main image, sponsored, price and
call-to-action assets — fully classified by Prebid's native renderer.

### Bid Params

{: .table .table-bordered .table-striped }
| Name          | Scope    | Description                                                                         | Example          | Type     |
|---------------|----------|-------------------------------------------------------------------------------------|------------------|----------|
| `placementId` | required | Publisher-side identifier for the slot. Used as `imp.tagid` for realry reporting.   | `'home-atf'`     | `string` |
| `sellerId`    | optional | Realry-side advertiser id, only when assigned by the Realry partnerships team.      | `'seller-acme'`  | `string` |

### Test Parameters — Banner

```javascript
var adUnits = [{
  code: 'test-banner',
  mediaTypes: {
    banner: { sizes: [[300, 250], [728, 90]] }
  },
  bids: [{
    bidder: 'realry',
    params: { placementId: 'home-atf' }
  }]
}];
```

### Test Parameters — Native (Native 1.2)

```javascript
var adUnits = [{
  code: 'test-native',
  mediaTypes: {
    native: {
      ortb: {
        assets: [
          { id: 1, required: 1, title: { len: 90 } },
          { id: 2, required: 1, img: { type: 3, wmin: 300, hmin: 250 } },
          { id: 3, data: { type: 1, len: 40 } },  // sponsored
          { id: 4, data: { type: 6 } },           // price
          { id: 5, data: { type: 12, len: 15 } }, // cta
        ],
      },
    },
  },
  bids: [{
    bidder: 'realry',
    params: { placementId: 'pdp-rail' }
  }]
}];
```

### Notes

- **Floors, eids, schain and consent** are handled by `ortbConverter`
  automatically — no extra params required.
- **No user sync** is configured today; Realry will publish a sync endpoint in
  a follow-up update once available.
- Bid responses are net revenue; default TTL is 300s.
