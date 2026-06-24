# Overview

```
Module Name: Yandex Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@yandex-team.com
```

# Description

The Yandex Prebid Adapter is designed for seamless integration with Yandex's advertising services. It facilitates effective bidding by leveraging Yandex's robust ad-serving technology, ensuring publishers can maximize their ad revenue through efficient and targeted ad placements. Please reach out to <prebid@yandex-team.com> for the integration guide and more details.

For comprehensive auction analytics, consider using the [Yandex Analytics Adapter](https://docs.prebid.org/dev-docs/analytics/yandex.html). This tool provides essential insights into auction dynamics and user interactions, empowering publishers to fine-tune their strategies for optimal ad performance.

# Parameters

| Name          | Scope                                  | Description  | Example          | Type      |
|---------------|----------------------------------------|--------------|------------------|-----------|
| `placementId` | Required                               | Placement ID | `'R-X-123456-1'` | `String`  |
| `cur`         | Optional. Default value is `'EUR'`     | Bid Currency | `'USD'`          | `String`  |
| `pageId`      | `Deprecated`. Please use `placementId` | Page ID      | `123`            | `Integer` |
| `impId`       | `Deprecated`. Please use `placementId` | Imp ID       | `1`              | `Integer` |

# Test Parameters

```javascript
var adUnits = [
  { // banner example. please check if the 'placementId' is active in Yandex UI
    code: 'banner-1',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300, 600]],
      }
    },
    bids: [
      {
        bidder: 'yandex',
        params: {
          placementId: 'R-A-346580-1',
          cur: 'USD'
        },
      }
    ],
  },
  { // video example. please check if the 'placementId' is active in Yandex UI
    code: 'video-1',
    mediaTypes: {
      video: {
        sizes: [[640, 480]],
        context: 'instream',
        playerSize: [[640, 480]],
        mimes: ['video/mp4'],
        protocols: [1, 2, 3, 4, 5, 6, 7, 8],
        playbackmethod: [2],
        skip: 1
      },
    },
    bids: [
      {
        bidder: 'yandex',
        params: {
          placementId: 'R-V-346580-1',
          cur: 'USD'
        },
      }
    ],
  },
  { // native example. please check if the 'placementId' is active in Yandex UI
    code: 'native-1',
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
          len: 25
        }
      },
    },
    bids: [
      {
        bidder: 'yandex',
        params: {
          placementId: 'R-A-346580-2',
          cur: 'USD'
        },
      }
    ],
  },
];
```
