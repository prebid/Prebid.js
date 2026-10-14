# Overview

```
Module Name: Escalax SSP Bidder Adapter
Module Type: Bidder Adapter
Maintainer: connect@escalax.io
```

# Description

Escalax Bidding adapter requires setup before beginning. Please contact us at <connect@escalax.io>

Supported media types: banner, video, native.

The region (US, EU or APAC) is selected automatically from the browser's timezone.

# Bid Parameters

The adapter supports two integrations. Each bid must use exactly one of them:
either `accountId` and `sourceId` together (exchange), or `supplyPlacementId` (SSP).
Bids that mix params from both integrations, or set only one of `accountId` / `sourceId`, are rejected.

| Name                | Scope                 | Description                                                             | Example      | Type     |
| ------------------- | --------------------- | ----------------------------------------------------------------------- | ------------ | -------- |
| `accountId`         | required for exchange | Account ID, used together with `sourceId`                               | `'hash'`     | `string` |
| `sourceId`          | required for exchange | Source ID, used together with `accountId`                               | `'sourceId'` | `string` |
| `supplyPlacementId` | required for SSP      | Supply placement ID                                                     | `'hash'`     | `string` |
| `bidfloor`          | optional              | Bid floor, used when the Price Floors module is not set                 | `0.5`        | `number` |
| `currency`          | optional              | Request currency when the Currency module is not set, defaults to `USD` | `'USD'`      | `string` |

# Test Parameters

## Exchange integration

```js
const adUnits = [
  {
    code: "banner1",
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250],
          [300, 600],
        ],
      },
    },
    bids: [
      {
        bidder: "escalax",
        params: {
          accountId: "hash",
          sourceId: "sourceId",
        },
      },
    ],
  },
  {
    code: "native_example",
    mediaTypes: {
      native: {
        ortb: {
          assets: [
            { id: 1, required: 1, title: { len: 80 } },
            { id: 2, required: 1, img: { type: 3, w: 300, h: 250 } },
          ],
        },
      },
    },
    bids: [
      {
        bidder: "escalax",
        params: {
          accountId: "hash",
          sourceId: "sourceId",
        },
      },
    ],
  },
  {
    code: "video1",
    mediaTypes: {
      video: {
        context: "instream",
        playerSize: [[640, 480]],
        minduration: 0,
        maxduration: 999,
        boxingallowed: 1,
        skip: 0,
        mimes: ["application/javascript", "video/mp4"],
        w: 1920,
        h: 1080,
        protocols: [2],
        linearity: 1,
        api: [1, 2],
      },
    },
    bids: [
      {
        bidder: "escalax",
        params: {
          accountId: "hash",
          sourceId: "sourceId",
        },
      },
    ],
  },
];
```

## SSP integration

```js
const adUnits = [
  {
    code: "banner1",
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250],
          [300, 600],
        ],
      },
    },
    bids: [
      {
        bidder: "escalax",
        params: {
          supplyPlacementId: "hash",
        },
      },
    ],
  },
];
```
