# Overview

```
Module Name: Intenze SSP Bidder Adapter
Module Type: Bidder Adapter
Maintainer: connect@intenze.co
```

# Description

Module that connects to Intenze SSP demand sources.

Supported media types: banner, video, native.

# Bid Parameters

| Name          | Scope    | Description                                             | Example  | Type     |
| ------------- | -------- | ------------------------------------------------------- | -------- | -------- |
| `accountId`   | optional | Account ID, routes the bid to the Ad Exchange           | `'hash'` | `string` |
| `placementId` | optional | Placement ID, routes the bid to the SSP                 | `'25'`   | `string` |
| `bidfloor`    | optional | Bid floor, used when the Price Floors module is not set | `0.5`    | `number` |
| `currency`    | optional | Request currency, defaults to `USD`                     | `'USD'`  | `string` |

Exactly one of `accountId` or `placementId` is required. They target different endpoints and cannot be combined.

# Test Parameters

```
var adUnits = [
  {
    code: 'banner_placement',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300, 600]]
      }
    },
    bids: [{
      bidder: 'intenze',
      params: {
        placementId: 'hash'
      }
    }]
  },
  {
    code: 'banner_account',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300, 600]]
      }
    },
    bids: [{
      bidder: 'intenze',
      params: {
        accountId: 'accountId'
      }
    }]
  },
  {
    code: 'native_example',
    mediaTypes: {
      native: {
        title: {
          required: true,
          len: 800
        },
        image: {
          required: true,
          len: 80
        },
        sponsoredBy: {
          required: true
        },
        clickUrl: {
          required: true
        },
        privacyLink: {
          required: false
        },
        body: {
          required: true
        },
        icon: {
          required: true,
          sizes: [50, 50]
        }
      }
    },
    bids: [{
      bidder: 'intenze',
      params: {
        placementId: 'hash'
      }
    }]
  },
  {
    code: 'video1',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 480]],
        minduration: 0,
        maxduration: 999,
        boxingallowed: 1,
        skip: 0,
        mimes: [
          'application/javascript',
          'video/mp4'
        ],
        w: 1920,
        h: 1080,
        protocols: [2],
        linearity: 1,
        api: [1, 2]
      }
    },
    bids: [{
      bidder: 'intenze',
      params: {
        accountId: 'accountId'
      }
    }]
  }
];
```
