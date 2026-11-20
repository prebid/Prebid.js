# Overview

```
Module Name: Wildberries Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support_publishers@rwb.ru
```

# Description

The Wildberries Prebid Adapter connects publishers to the Wildberries advertising network. It supports banner ads only and sends all bids of an auction to the Wildberries ad server in a single OpenRTB request.

The bidder code is `wb`.

# Features

- Banner only.
- TCF/GDPR, USP, GPP, schain, userId eids and Price Floors are forwarded to the ad server.
- No `gvlid` yet.
- Bids are returned in RUB. If the ad server currency is not RUB, include the `currency` module and provide a RUB conversion rate (`rates` or `conversionRateFile`): the default Prebid rate file does not contain RUB.

# Parameters

| Name          | Scope    | Description                                                     | Example                                  | Type     |
|---------------|----------|-----------------------------------------------------------------|------------------------------------------|----------|
| `placementId` | Required | Placement ID, UUID (dashed or 32 hex characters without dashes) | `'43d7cdd5-61db-4b12-889f-3d48a9fd213f'` | `String` |

# Test Parameters

```javascript
var adUnits = [
  {
    code: 'banner-1',
    mediaTypes: {
      banner: {
        sizes: [[728, 90]],
      }
    },
    bids: [
      {
        bidder: 'wb',
        params: {
          placementId: '43d7cdd5-61db-4b12-889f-3d48a9fd213f'
        },
      }
    ],
  },
  {
    code: 'banner-2',
    mediaTypes: {
      banner: {
        sizes: [[728, 90]],
      }
    },
    bids: [
      {
        bidder: 'wb',
        params: {
          placementId: '48bcda01-367a-4f52-b524-130301b3999d'
        },
      }
    ],
  },
];
```
