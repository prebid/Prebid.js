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
    code: "sourceId",
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
          sourceId: "hash",
          accountId: "accountId",
          host: "host",
        },
      },
    ],
  },
  {
    code: "native_example",
    mediaTypes: {
      native: {
        title: {
          required: true,
          len: 800,
        },
        image: {
          required: true,
          len: 80,
        },
        sponsoredBy: {
          required: true,
        },
        clickUrl: {
          required: true,
        },
        privacyLink: {
          required: false,
        },
        body: {
          required: true,
        },
        icon: {
          required: true,
          sizes: [50, 50],
        },
      },
    },
    bids: [
      {
        bidder: "escalax",
        params: {
          sourceId: "hash",
          accountId: "accountId",
          host: "host",
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
          sourceId: "hash",
          accountId: "accountId",
          host: "host",
        },
      },
    ],
  },
];
```
