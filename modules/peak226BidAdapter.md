---
layout: bidder
title: peak226
description: Prebid peak226 Bidder Adapter
biddercode: peak226
tcfeu_supported: true
usp_supported: true
gpp_supported: true
coppa_supported: true
schain_supported: true
floors_supported: true
media_types: banner, video, native
gvl_id: 1202
pbjs: true
pbs: true
---

### Overview

```
Module Name: peak226 Bid Adapter
Module Type: Bidder Adapter
Maintainer: support@edge226.com
```

### Description

The peak226 Bid Adapter connects Prebid.js to the peak226 SSP for **banner**,
**video** (instream and outstream) and **native** demand. It is built on
Prebid's `ortbConverter`, so it automatically forwards standard OpenRTB
signals — sizes, price floors (priceFloors module), user IDs (`eids`), supply
chain (`schain`), and consent (TCF EU, US Privacy, GPP, COPPA) — derived from
the ad unit and `ortb2`. Requests are routed to a per-data-center endpoint
(US, EU, or JP).

For outstream video, peak226 returns VAST directly and does not host its own
renderer; publishers must supply their own `mediaTypes.video.renderer` (or
rely on their ad server) for outstream placements.

### Bid Params

{: .table .table-bordered .table-striped }
| Name          | Scope    | Description                                                        | Example      | Type     |
|---------------|----------|---------------------------------------------------------------------|--------------|----------|
| `publisherId` | required | Your peak226 publisher/account ID.                                   | `'pub-123'`  | `string` |
| `placementId` | required | Placement ID for this ad unit.                                       | `'plc-456'`  | `string` |
| `region`      | optional | Data center to send the request to: `'us'`, `'eu'`, or `'jp'`. Defaults to `'us'`. | `'eu'` | `string` |

### Test Parameters — Banner

```javascript
var adUnits = [{
  code: 'test-banner',
  mediaTypes: {
    banner: { sizes: [[300, 250], [728, 90]] }
  },
  bids: [{
    bidder: 'peak226',
    params: { publisherId: 'pub-test', placementId: 'plc-test' }
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
    bidder: 'peak226',
    params: { publisherId: 'pub-test', placementId: 'plc-test' }
  }]
}];
```

### Test Parameters — Native

```javascript
var adUnits = [{
  code: 'test-native',
  mediaTypes: {
    native: {
      ortb: {
        assets: [
          { id: 1, required: 1, title: { len: 80 } },
          { id: 2, required: 1, img: { type: 3, w: 300, h: 250 } }
        ]
      }
    }
  },
  bids: [{
    bidder: 'peak226',
    params: { publisherId: 'pub-test', placementId: 'plc-test', region: 'eu' }
  }]
}];
```

### Notes

- **First-party data, floors, eids, schain and consent** are handled by
  `ortbConverter` automatically from the ad unit and `ortb2` — no extra
  params required.
- **Multiformat ad units** are fully supported: banner, video and native may be declared
  on the same ad unit, all declared formats are sent on a single impression, and peak226
  may bid on any of them. Note that a multiformat unit including `video` must still supply
  `mimes` and a player size, or the whole bid — banner and native included — is dropped.
- **User sync** is not yet implemented; it will be added once sync support
  (pixel/iframe) and the sync URL(s) are confirmed.
- Bid responses are net revenue; default TTL is 300s.
- `gvl_id: 1202` is pending verification against the IAB TCF Global Vendor
  List.
