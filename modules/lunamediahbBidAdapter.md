# Overview

```
Module Name: LunamediaHB Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@ferio.cloud
```

# Description

Module that connects to LunamediaHB demand sources.

# Bid Params

| Name          | Scope    | Type   | Description                              |
| ------------- | -------- | ------ | ---------------------------------------- |
| `publisherId` | required | String | Publisher ID on the Lunamedia platform.  |
| `adUnitId`    | required | String | Ad unit ID on the Lunamedia platform.    |
| `tenantId`    | required | String | Tenant ID on the Lunamedia platform.     |

# Test Parameters

```javascript
var adUnits = [
  {
    code: "banner-div",
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      },
    },
    bids: [
      {
        bidder: "lunamediahb",
        params: {
          publisherId: "publisher-123",
          adUnitId: "ad-unit-456",
          tenantId: "tenant-789",
        },
      },
    ],
  },
  {
    code: "video-div",
    mediaTypes: {
      video: {
        playerSize: [640, 480],
        context: "instream",
        mimes: ["video/mp4"],
        protocols: [2, 3, 5, 6],
      },
    },
    bids: [
      {
        bidder: "lunamediahb",
        params: {
          publisherId: "publisher-123",
          adUnitId: "ad-unit-456",
          tenantId: "tenant-789",
        },
      },
    ],
  },
  {
    code: "native-div",
    mediaTypes: {
      native: {
        ortb: {
          ver: "1.2",
          assets: [
            {
              id: 1,
              required: 1,
              title: {
                len: 90,
              },
            },
            {
              id: 2,
              required: 1,
              img: {
                type: 3,
                w: 300,
                h: 250,
              },
            },
          ],
        },
      },
    },
    bids: [
      {
        bidder: "lunamediahb",
        params: {
          publisherId: "publisher-123",
          adUnitId: "ad-unit-456",
          tenantId: "tenant-789",
        },
      },
    ],
  },
];
```
