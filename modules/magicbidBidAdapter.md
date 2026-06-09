# Overview

```
Module Name  : MagicBid Bid Adapter
Module Type  : Bidder Adapter
Maintainer   : support@magicbid.ai
```

## Description

MagicBid connects publishers to premium demand through a high-performance RTB platform.
Supports **Banner** and **Video** (instream) ad formats.

The `adUnitType` is automatically inferred from the `mediaTypes` object — you do not need to set it explicitly.

When you onboard a publisher, MagicBid provides two values specific to that publisher:
- `host` — a unique RTB endpoint hostname generated for that publisher (not static, unique per publisher)
- `adUnitId` — the placement ID for each ad slot

---

## Bid Params

Types are defined in `modules/magicbidBidAdapter.d.ts`.

| Name          | Scope    | Type     | Description                                                  | Example                         |
|---------------|----------|----------|--------------------------------------------------------------|---------------------------------|
| `host`        | required | string   | Publisher-specific RTB host (unique per publisher)           | `'ads-2j0kac.rtb-magicbid.ai'` |
| `adUnitId`    | required | integer  | Ad Unit ID for this placement                                | `631967104`                     |
| `adUnitType`  | optional | string   | `'banner'` or `'video'`; inferred from mediaTypes if omitted | `'banner'`                      |
| `publisherId` | optional | string   | Publisher ID (required only for Prebid Server)               | `'pub-12345'`                   |
| `custom1`     | optional | string   | Custom targeting parameter 1                                 | `'sports'`                      |
| `custom2`     | optional | string   | Custom targeting parameter 2                                 | `'en'`                          |
| `custom3`     | optional | string   | Custom targeting parameter 3                                 | `'US'`                          |
| `custom4`     | optional | string   | Custom targeting parameter 4                                 | `'premium'`                     |
| `custom5`     | optional | string   | Custom targeting parameter 5                                 | `'homepage'`                    |

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
          host: 'ads-2j0kac.rtb-magicbid.ai', // provided by MagicBid, unique per publisher
          adUnitId: 631967104                   // provided by MagicBid
          // adUnitType is inferred automatically from mediaTypes.banner
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
          host: 'ads-2j0kac.rtb-magicbid.ai', // provided by MagicBid, unique per publisher
          adUnitId: 631967104                   // provided by MagicBid
          // adUnitType is inferred automatically from mediaTypes.video
        }
      }
    ]
  }
];
```

---

## Notes

- The `host` value is **not static** — it is unique per publisher and generated when MagicBid onboards a new publisher via the Limelight platform.
- Contact [support@magicbid.ai](mailto:support@magicbid.ai) to receive your `host` and `adUnitId` values.
- GDPR, USP/CCPA, COPPA, GPP, and Supply Chain (schain) signals are automatically forwarded.
- User ID modules (all) are supported via `eids`.
