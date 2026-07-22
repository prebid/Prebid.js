# Overview

Module Name: Unicorn Rtd Provider
Module Type: Rtd Provider
Maintainer: service+prebid.js@bulbit.jp

# Description

This RTD module measures, for each ad slot, its on-screen position and
viewability (visible area ratio) on the client before the auction starts, and
injects the result into `adUnit.ortb2Imp` so it flows into the bid request. It
is intended to be used together with the Unicorn Bid Adapter, which reads the
values back and forwards them on the wire.

The module measures:

- the standard OpenRTB ad position `ortb2Imp.banner.pos`, per AdCOM 1.0 Placement Positions (2 = locked/fixed, 1 = above the fold, 3 = below the fold);
- an object `ortb2Imp.ext.data.adslot` holding the slot's visibility ratio, a sticky/fixed flag, its document-relative position and its rendered size.

Measurement runs once, on the animation frame after the DOM is ready, within the
configured `auctionDelay`. No page-side timing wiring is required — the publisher
just calls `requestBids()` as usual.

# Integration

Build the module together with the RTD core and the Unicorn Bid Adapter:

```bash
gulp build --modules=unicornBidAdapter,rtdModule,unicornRtdProvider
```

# Configuration

```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 300,
    dataProviders: [{
      name: 'unicorn',
      waitForIt: true
    }]
  }
});
```

The submodule takes no `params`.

## Slot element resolution

For each ad unit the module resolves the slot's DOM element id in this order:

1. `ortb2Imp.ext.data.divId` — explicit override;
2. the GPT slot mapping (`getSlotElementId`) — when the ad unit code differs from the div id;
3. the ad unit code itself.

Set `ortb2Imp.ext.data.divId` when the ad unit code is not the div id and GPT is
not yet defined at auction time.

# What the module injects

| Field | Type | Unit / range | Meaning |
|---|---|---|---|
| `ortb2Imp.banner.pos` | int | AdCOM 1.0 Placement Position | 2 = locked (fixed), 1 = above the fold, 3 = below the fold |
| `ortb2Imp.ext.data.adslot.ver` | int | — | signal schema version (currently `1`) |
| `ortb2Imp.ext.data.adslot.ratio` | number | 0.0–1.0 | visible area ratio at measurement time |
| `ortb2Imp.ext.data.adslot.fixed` | bool | — | slot is `position: fixed` / `sticky` |
| `ortb2Imp.ext.data.adslot.x` | int | CSS px, document-relative | slot element left |
| `ortb2Imp.ext.data.adslot.y` | int | CSS px, document-relative | slot element top |
| `ortb2Imp.ext.data.adslot.w` | int | CSS px | slot element rendered width |
| `ortb2Imp.ext.data.adslot.h` | int | CSS px | slot element rendered height |

Coordinates are document-relative (page origin, independent of the scroll
position) and expressed in CSS pixels.

The Unicorn Bid Adapter forwards this object to the wire as `imp.ext.adslot`,
and the position as `imp.banner.pos`.
