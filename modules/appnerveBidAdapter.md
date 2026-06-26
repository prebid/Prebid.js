---
layout: bidder
title: Appnerve
description: Prebid Appnerve Bidder Adapter
biddercode: appnerve
media_types: banner, video, native, audio
pbjs: true
pbs: false
schain_supported: true
floors_supported: true
fpd_supported: true
multiformat_supported: will-bid-on-any
deals_supported: true
coppa_supported: true
usp_supported: true
sidebarType: 1
---

# Appnerve

The Appnerve adapter connects Prebid.js publisher inventory to Appnerve
Exchange at `https://exchange.appnerve.net/openrtb2/auction`.

## Bid Parameters

| Name | Scope | Type | Description |
| --- | --- | --- | --- |
| `sourceId` | required | string | Active Appnerve ad-source ID. |
| `placementId` | optional | string | Backward-compatible alias for `sourceId`. |

```javascript
const adUnits = [{
  code: 'homepage-banner',
  mediaTypes: {
    banner: {sizes: [[300, 250], [320, 50]]}
  },
  bids: [{
    bidder: 'appnerve',
    params: {sourceId: '74000976'}
  }]
}];
```

The adapter supports banner, video, native, and audio OpenRTB impressions,
multiple impressions, floors, deals, first-party data, supply chain, GDPR,
GPP, US Privacy, and COPPA signals supplied by Prebid.js.

Appnerve does not perform browser user syncing. No GVL ID is declared until an
official Appnerve IAB registration is confirmed. Audio should only be enabled
for a source with active audio demand and a maintained audio test creative.
