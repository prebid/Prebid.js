---
layout: bidder
title: Clickio
description: Clickio Bidder Adapter
biddercode: clickio
media_types: banner
gdpr_supported: true
tcfeu_supported: true
gvl_id: 1500
usp_supported: true
gpp_supported: true
schain_supported: true
coppa_supported: true
userId: all
---

# Overview

```
Module Name:  Clickio Bidder Adapter
Module Type:  Bidder Adapter
Maintainer: support@clickio.com
```

### Description

The Clickio bid adapter connects to Clickio's demand platform using OpenRTB 2.5 standard. This adapter supports banner advertising.

The Clickio bidding adapter requires initial setup before use. Please contact us at [support@clickio.com](mailto:support@clickio.com).
To get started, simply replace the ``said`` with the ID assigned to you.

### User Sync

The adapter syncs user IDs with Clickio's demand partners through `o.clickiocdn.com`, passing the GDPR, US Privacy and GPP consent to it.

- When iframe syncs are allowed for `clickio`, the adapter registers one iframe that syncs all demand partners.
- Otherwise, when image syncs are allowed (Prebid's default), it registers up to five images. Each image serves its own share of the demand partners: it redirects to one the user is not synced with yet, or returns an empty pixel, which the browser caches, when there is none.

No user sync is registered when COPPA applies. The adapter does not use device storage.

### Test Parameters

```javascript
var adUnits = [
  {
    code: 'clickio-banner-ad',
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250]
        ]
      }
    },
    bids: [
        {
            bidder: 'clickio',
            params: {
                said: 'test',
            }
        }
    ]
  }
];
```