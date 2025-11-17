---
layout: bidder
title: Clickio
description: Clickio Bidder Adapter
biddercode: clickio
media_types: banner
gdpr_supported: true
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