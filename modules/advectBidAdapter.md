# Overview

```
Module Name: Advect Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@advect.ru
```

# Description

The Advect Prebid Adapter is designed for seamless integration with Advect's advertising services. It facilitates effective bidding by leveraging Advect's robust ad-serving technology, ensuring publishers can maximize their ad revenue through efficient and targeted ad placements.

# Parameters

| Name          | Required?                                  | Description | Example | Type      |
|---------------|--------------------------------------------|-------------|---------|-----------|
| `placementId` | Yes                                        | Block ID    | `123-1` | `String`  |
| `pageId`      | No<br>Deprecated. Please use `placementId` | Page ID     | `123`   | `Integer` |
| `impId`       | No<br>Deprecated. Please use `placementId` | Imp ID      | `1`     | `Integer` |

# Test Parameters

```javascript
var adUnits = [
  { // banner
    code: 'banner-1',
    mediaTypes: {
      banner: {
        sizes: [[240, 400], [300, 600]],
      }
    },
    bids: [
      {
        bidder: 'advect',
        params: {
          placementId: '346580-1'
        },
      }
    ],
  },
];
```
