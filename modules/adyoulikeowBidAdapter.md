# Overview

```
Module Name: AdyoulikeOW Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid-owayl@adyoulike.com
```

# Description

Connects to the OpenWeb/AYL OW SSP endpoint for banner and video demand via Prebid.js.

# Bid Params

| Name | Scope | Description | Example | Type |
| --- | --- | --- | --- | --- |
| `placementId` | required | Hash-based placement id from OpenWeb/AYL (identifies the partner/slot server-side) | `'354f787b85c829fb83g2cdaf1ae64435'` | `string` |
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
        bidder: 'adyoulikeow',
        params: {
          placementId: '354f787b85c829fb83g2cdaf1ae64435',
          bidFloor: 0.5
        }
      }
    ]
  }
];
```
