# MobileFuse Bidder Adapter

## Overview

Module Name: MobileFuse Bidder Adapter
Module Type: Bidder
Maintainer: prebid@mobilefuse.com
GVL ID: 909

The MobileFuse adapter supports banner and video formats. It supports OpenRTB 2.6 request fields and standard TCF privacy signals, including GPP, GDPR, and CCPA (USP). User ID modules such as SharedID, UID2, and ID5 are also supported via `userIdAsEids`.

## Supported Media Types
- Banner
- Video

## Bid Params
| Name           | Scope     | Type   | Description                           |
|----------------|-----------|--------|---------------------------------------|
| `placement_id` | required  | string | Identifier for the ad placement       |
| `bidfloor`     | optional  | number | Static floor price (in USD) for the impression |

### Banner Example
```javascript
var adUnits = [
  {
    code: 'ad-slot-1',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [
      {
        bidder: 'mobilefuse',
        params: {
          placement_id: 'abc123',
          bidfloor: 1.25
        }
      }
    ]
  }
];
```

### Video Example
```javascript
var adUnits = [
  {
    code: 'video-slot-1',
    mediaTypes: {
      video: {
        playerSize: [[640, 480]],
        context: 'instream',
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6]
      }
    },
    bids: [
      {
        bidder: 'mobilefuse',
        params: {
          placement_id: 'video123',
          bidfloor: 2.00
        }
      }
    ]
  }
];
```

## Prebid Support Features

| Feature               | Supported |
|-----------------------|-----------|
| Multi-format (Banner & Video) | Yes       |
| Supply Chain Object (`schain`) | Yes       |
| Floor Module Support (`getFloor`) | Yes   |
| User Sync (iframe)     | Yes       |
| GDPR Support           | Yes       |
| USP/CCPA Support       | Yes       |
| GPP Support            | Yes       |
| User ID Support via `userIdAsEids` | Yes |
| OpenRTB 2.6 Compliance | Yes       |

## User Sync
The adapter supports iframe-based user syncing. Sync URLs include `gpp`, `gpp_sid`, `gdpr`, `gdpr_consent`, and `us_privacy` when applicable.
