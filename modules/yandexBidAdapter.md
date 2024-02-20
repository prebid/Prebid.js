# Overview

```
Module Name: Yandex Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@yandex-team.com
```

# Description

The Yandex Prebid Adapter is designed for seamless integration with Yandex's advertising services. It facilitates effective bidding by leveraging Yandex's robust ad-serving technology, ensuring publishers can maximize their ad revenue through efficient and targeted ad placements.

For comprehensive auction analytics, consider using the [Yandex Analytics Adapter](https://docs.prebid.org/dev-docs/analytics/yandex.html). This tool provides essential insights into auction dynamics and user interactions, empowering publishers to fine-tune their strategies for optimal ad performance.

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
        bidder: 'yandex',
        params: {
          placementId: '346580-1'
        },
      }
    ],
  },
  { // native
    code: 'banner-2',
    mediaTypes: {
      native: {
        title: {
          required: true,
          len: 25
        },
        image: {
          required: true,
          sizes: [300, 250],
        },
        icon: {
          sizes: [32, 32],
        },
        body: {
          len: 90
        },
        body2: {
          len: 90
        },
        sponsoredBy: {
          len: 25,
        }
      },
    },
    bids: [
      {
        bidder: 'yandex',
        params: {
          placementId: '346580-1'
        },
      }
    ],
  },
];
```
