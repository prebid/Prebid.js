# Overview

```
Module Name: Intenze SSP Bidder Adapter
Module Type: Bidder Adapter
Maintainer: connect@intenze.co
```

# Description

Module that connects to Intenze demand sources through two integrations: the Ad Exchange and the SSP.

Supported media types: banner, video, native.

The region (US, EU or APAC) is selected automatically from the browser's timezone.

# Bid Parameters

Each bid must use exactly one integration: `accountId` for the Ad Exchange, or `placementId` for the SSP.
They target different endpoints and cannot be combined: bids that set both are rejected by `isBidRequestValid`.

| Name          | Scope                    | Description                                                                                         | Example  | Type     |
| ------------- | ------------------------ | --------------------------------------------------------------------------------------------------- | -------- | -------- |
| `accountId`   | required for Ad Exchange | Account ID, routes the bid to the Ad Exchange                                                       | `'hash'` | `string` |
| `placementId` | required for SSP         | Placement ID, routes the bid to the SSP                                                             | `'25'`   | `string` |
| `bidfloor`    | optional                 | Bid floor, used when the Price Floors module sets none; its currency is `currency` (USD by default) | `0.5`    | `number` |
| `currency`    | optional                 | Request currency when the Currency module is not set, defaults to `USD`                             | `'USD'`  | `string` |

# Test Parameters

## Ad Exchange integration

```
var adUnits = [
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

## SSP integration

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
  }
];
```
