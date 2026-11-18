# Overview

```
Module Name: Truvid Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@truvid.com
```

# Description

Connects to the Truvid SSP endpoint for banner and video demand via Prebid.js.

# Bid Params

| Name          | Scope    | Description                                                                   | Example                              | Type     |
|---------------|----------|-------------------------------------------------------------------------------|--------------------------------------|----------|
| `placementId` | required | Hash-based placement id from Truvid (identifies the partner/slot server-side) | `'7a2e91c4d05b3f68a1c9e0b4d7f25a36'` | `string` |
| `bidFloor`    | optional | Minimum CPM floor for the impression                                          | `0.50`                               | `number` |
| `currency`    | optional | Currency for the floor, defaults to `USD`                                     | `'USD'`                              | `string` |

# Test Parameters

```js
var adUnits = [
  {
    code: 'banner-ad-unit',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [
      {
        bidder: 'truvid',
        params: {
          placementId: '7a2e91c4d05b3f68a1c9e0b4d7f25a36',
          bidFloor: 0.5
        }
      }
    ]
  }
];
```
