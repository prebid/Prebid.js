---
layout: bidder
title: Vuukle
description: Prebid Vuukle Bidder Adapter
biddercode: vuukle
tcfeu_supported: true
usp_supported: true
gpp_supported: true
schain_supported: true
userId: all
media_types: banner, video, native
gvl_id: 1004
safeframes_ok: true
floors_supported: true
pbjs: true
pbs: false
---

### Overview

```
Module Name: Vuukle Bid Adapter
Module Type: Bidder Adapter
Maintainer: support@vuukle.com
```

### Description

The Vuukle Bid Adapter connects Prebid.js to the Vuukle SSP for **banner**, **native** and
**video** (instream and outstream) demand. It is built on Prebid's
`ortbConverter`, so it automatically forwards standard OpenRTB signals — sizes,
price floors (priceFloors module), user IDs (`eids`), supply chain (`schain`),
and consent (TCF EU, US Privacy, GPP, COPPA, DSA) — derived from the ad unit and
`ortb2`. For outstream video, the adapter installs a Vuukle-hosted renderer
unless the publisher supplies their own.

### Bid Params

{: .table .table-bordered .table-striped }
| Name          | Scope    | Description                                                                 | Example                | Type     |
|---------------|----------|-----------------------------------------------------------------------------|------------------------|----------|
| `sid`         | required | Your Vuukle seller ID, as listed in [vuukle.com/sellers.json](https://vuukle.com/sellers.json). | `'vuukle-12345'`       | `string` |
| `placementId` | optional | A named placement/tag ID. Falls back to the ad unit code if omitted.        | `'homepage-atf'`       | `string` |
| `bidfloor`    | optional | Hard floor (USD). The priceFloors module is preferred when configured.      | `1.50`                 | `number` |

**Required:** `sid` is required on every request. For **video**, `mediaTypes.video` must include `context`, `playerSize`, and `mimes`.

### Test Parameters — Banner

```javascript
var adUnits = [{
  code: 'test-banner',
  mediaTypes: {
    banner: { sizes: [[300, 250], [728, 90]] }
  },
  bids: [{
    bidder: 'vuukle',
    params: { sid: 'vuukle-test' }
  }]
}];
```

### Test Parameters — Video (outstream)

```javascript
var adUnits = [{
  code: 'test-video',
  mediaTypes: {
    video: {
      context: 'outstream',
      playerSize: [640, 480],
      mimes: ['video/mp4'],
      protocols: [2, 3, 5, 6],
      api: [2],
      plcmt: 4
    }
  },
  bids: [{
    bidder: 'vuukle',
    params: { sid: 'vuukle-test' }
  }]
}];
```

### Notes

- **First-party data, floors, eids, schain and consent** are handled by
  `ortbConverter` automatically from the ad unit and `ortb2` — no extra params
  required.
- **User sync**: the adapter supports both iframe and image (pixel) syncs,
  gated by the publisher's `userSync` configuration and forwarded consent.
- Bid responses are net revenue; default TTL is 300s.
