# Overview

```
Module Name: Escalax SSP Bidder Adapter
Module Type: Bidder Adapter
Maintainer: connect@escalax.io
```

# Description

Escalax Bidding adapter requires setup before beginning. Please contact us at <connect@escalax.io>

# Test Parameters

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
      native: {},
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
    sizes: [640, 480],
    mediaTypes: {
      video: {
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
