# Overview

```
Module Name  : MagicBid Bid Adapter
Module Type  : Bidder Adapter
Maintainer   : support@magicbid.ai
```

## Description

MagicBid connects publishers to premium demand through a high-performance RTB platform.  
Supports **Banner** and **Video** (instream) ad formats.

When you onboard a publisher, MagicBid provides three values specific to that publisher:
- `host` — a unique RTB endpoint hostname generated for that publisher
- `adUnitId` — the placement ID for each ad slot
- `adUnitType` — the format (`banner` or `video`)

---

## Bid Params

| Name          | Scope    | Description                                                    | Example                          | Type      |
|---------------|----------|----------------------------------------------------------------|----------------------------------|-----------|
| `host`        | required | Publisher-specific RTB host provided by MagicBid               | `'ads-2j0kac.rtb-magicbid.ai'`  | `string`  |
| `adUnitId`    | required | Ad Unit ID for this placement, provided by MagicBid            | `631967104`                      | `integer` |
| `adUnitType`  | required | Ad format: `'banner'` or `'video'`                             | `'banner'`                       | `string`  |
| `publisherId` | optional | Publisher ID (required only for Prebid Server / server-side)   | `'pub-12345'`                    | `string`  |
| `custom1`     | optional | Custom targeting parameter 1                                   | `'sports'`                       | `string`  |
| `custom2`     | optional | Custom targeting parameter 2                                   | `'en'`                           | `string`  |
| `custom3`     | optional | Custom targeting parameter 3                                   | `'US'`                           | `string`  |
| `custom4`     | optional | Custom targeting parameter 4                                   | `'premium'`                      | `string`  |
| `custom5`     | optional | Custom targeting parameter 5                                   | `'homepage'`                     | `string`  |

---

## Banner Example

```javascript
var adUnits = [
  {
    code: 'banner-ad-unit',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]]
      }
    },
    bids: [
      {
        bidder: 'magicbid',
        params: {
          host: 'ads-2j0kac.rtb-magicbid.ai',  // provided by MagicBid, unique per publisher
          adUnitId: 631967104,                   // provided by MagicBid
          adUnitType: 'banner'
        }
      }
    ]
  }
];
```

---

## Video (Instream) Example

```javascript
var adUnits = [
  {
    code: 'video-ad-unit',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 480]],
        mimes: ['video/mp4'],
        protocols: [1, 2, 3, 4, 5, 6],
        playbackmethod: [2],
        skip: 1
      }
    },
    bids: [
      {
        bidder: 'magicbid',
        params: {
          host: 'ads-2j0kac.rtb-magicbid.ai',  // provided by MagicBid, unique per publisher
          adUnitId: 631967104,                   // provided by MagicBid
          adUnitType: 'video'
        }
      }
    ]
  }
];
```

---

## Notes

- The `host` value is unique per publisher and is generated when MagicBid onboards a new publisher. Contact [support@magicbid.ai](mailto:prebid@magicbid.com) to get your values.
- GDPR, USP/CCPA, COPPA, GPP, and Supply Chain (schain) signals are automatically forwarded.
- User ID modules (all) are supported via `eids`.
