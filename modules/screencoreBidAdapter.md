# Overview

**Module Name:** Screencore Bidder Adapter

**Module Type:** Bidder Adapter

**Maintainer:** connect@screencore.io

# Description

Module that connects to Screencore's SSP demand source via OpenRTB.

Supported media types: banner, video, native.

The SSP region (US, EU or APAC) is selected automatically from the browser's timezone.

# Bid Parameters

| Name             | Scope      | Description                                                                                         | Example | Type     |
| ---------------- | ---------- | --------------------------------------------------------------------------------------------------- | ------- | -------- |
| `sspPlacementId` | required   | Screencore SSP placement ID                                                                         | `'123'` | `string` |
| `placementId`    | deprecated | Older name for the placement ID, used as `sspPlacementId` when that is not set                      | `'123'` | `string` |
| `endpointId`     | deprecated | Older name for the placement ID, used as `sspPlacementId` when neither it nor `placementId` is set  | `'123'` | `string` |
| `bidfloor`       | optional   | Bid floor, used when the Price Floors module sets none; its currency is `currency` (USD by default) | `0.5`   | `number` |
| `currency`       | optional   | Request currency when the Currency module is not set, defaults to `USD`                             | `'USD'` | `string` |

`placementId` and `endpointId` are still accepted so that existing configurations keep working,
but they are deprecated: use `sspPlacementId` for new setups. If several are set, `sspPlacementId`
takes precedence, then `placementId`, then `endpointId`.

# Test Parameters

## SSP Integration

```js
var adUnits = [
  {
    code: "test-banner",
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      },
    },
    bids: [
      {
        bidder: "screencore",
        params: {
          sspPlacementId: "123",
        },
      },
    ],
  },
  {
    code: "test-video",
    mediaTypes: {
      video: {
        context: "instream",
        playerSize: [[640, 480]],
        mimes: ["video/mp4"],
        protocols: [2, 3, 5, 6],
      },
    },
    bids: [
      {
        bidder: "screencore",
        params: {
          sspPlacementId: "123",
        },
      },
    ],
  },
];
```
