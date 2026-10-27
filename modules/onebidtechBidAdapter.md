# Overview

```
Module Name: One Bid Tech Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@onebidtech.com
```

# Description

Connects to the One Bid Tech SSP endpoint for banner and video demand via Prebid.js.

# Bid Params

| Name | Scope | Description | Example | Type |
| --- | --- | --- | --- | --- |
| `placementId` | required | Hash-based placement id from One Bid Tech (identifies the partner/slot server-side) | `'194f787b85c829fb8822cdaf1ae64435'` | `string` |
| `bidFloor` | optional | Minimum CPM floor for the impression | `0.50` | `number` |
| `currency` | optional | Currency for the floor, defaults to `USD` | `'USD'` | `string` |

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
        bidder: 'onebidtech',
        params: {
          placementId: '194f787b85c829fb8822cdaf1ae64435',
          bidFloor: 0.5
        }
      }
    ]
  }
];
```
