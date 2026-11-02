# Overview

**Module Name**: UNICORN Bid Adapter
**Module Type**: Bidder Adapter
**Maintainer**: service+prebid.js@bulbit.jp

# Description

Module that connects to UNICORN.

For each bid request, the adapter measures the ad slot's on-screen
position/geometry and viewability and sends it in the OpenRTB payload it
builds — this is scoped to this adapter's own request only, nothing is
written back to shared First Party Data:

- `imp.banner.pos` — OpenRTB AdPosition (1 = above the fold, 3 = below the
  fold). A publisher-declared `ortb2Imp.banner.pos`, if present, is used
  instead of the measured value.
- `imp.ext.adslot` — `{ ver, ratio, fixed, sticky, w, h, x, y }`, where
  `ratio` is the visible-area ratio (0–1), `fixed`/`sticky` report a
  fixed/sticky ancestor, and `x`/`y`/`w`/`h` are the slot's document-relative
  position and rendered size in CSS pixels.
- `imp.ext.gpid` — the Global Placement ID, forwarded from
  `ortb2Imp.ext.gpid` (set by the `gpid` / `gptPreAuction` module) when present.

Slot element resolution order: `ortb2Imp.ext.data.divId` → GPT
`getSlotElementId()` → the ad unit code.

# Test Parameters

```js
    const adUnits = [{
        code: 'test-adunit1', // REQUIRED: adunit code
        mediaTypes: {
            banner: {
                sizes: [[300, 250]] // a banner size
            }
        },
        bids: [{
            bidder: 'unicorn',
            params: {
                placementId: 'rectangle-ad-1', // OPTIONAL: If placementId is empty, adunit code will be used as placementId. 
                publisherId: 99999 // OPTIONAL: Account specific publisher id
                mediaId: "uc" // OPTIONAL: Publisher specific media id
                accountId: 12345, // REQUIRED: Account ID for charge request
                bcat: ['IAB-1', 'IAB-2'] // OPTIONAL: blocked IAB categories
            }
        }]
    }];
```
