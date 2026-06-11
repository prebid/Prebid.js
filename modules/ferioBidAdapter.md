# Overview

```
Module Name: Ferio Bid Adapter
Module Type: Bidder Adapter
Maintainer: prebid@ferio.cloud
```

# Description

Connects to Ferio demand sources for bids.
Ferio bid adapter supports banner, video, and native ads.

# Bid Params

| Name          | Scope    | Type   | Description                         |
| ------------- | -------- | ------ | ----------------------------------- |
| `publisherId` | required | String | Publisher ID on the Ferio platform. |
| `adUnitId`    | required | String | Ad unit ID on the Ferio platform.   |
| `tenantId`    | required | String | Tenant ID on the Ferio platform.    |

# Aliases

| Alias       | Company   | Maintainer         | Endpoint domain |
| ----------- | --------- | ------------------ | --------------- |
| `myfeature` | MyFeature | prebid@ferio.cloud | featuretv.bid   |

Client-side aliases take the same bid params as `ferio` and request bids from
their own endpoint domain. The `myfeature` alias is not configured as a Prebid
Server/S2S alias. User syncs for aliases only run when the publisher enables
`userSync.aliasSyncEnabled` via `pbjs.setConfig`.

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
        bidder: "myfeature",
        params: {
          tenantId: "myfeature-pbjs",
          publisherId: "pub22yCUTGq6An3d",
          adUnitId: "59a8d685-ed01-4b10-9f50-fe9ad0c9c0c1",
        },
      },
    ],
  },
];
```

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
        bidder: "ferio",
        params: {
          tenantId: "client-pbjs",
          publisherId: "pub22yCUTGq6An3d",
          adUnitId: "59a8d685-ed01-4b10-9f50-fe9ad0c9c0c1",
        },
      },
    ],
  },
  {
    code: "video-div",
    mediaTypes: {
      video: {
        context: "instream",
        playerSize: [640, 480],
        mimes: ["video/mp4"],
        protocols: [2, 3, 5, 6],
      },
    },
    bids: [
      {
        bidder: "ferio",
        params: {
          tenantId: "client-pbjs",
          publisherId: "pub22yCUTGq6An3d",
          adUnitId: "59a8d685-ed01-4b10-9f50-fe9ad0c9c0c1",
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
        bidder: "ferio",
        params: {
          tenantId: "client-pbjs",
          publisherId: "pub22yCUTGq6An3d",
          adUnitId: "59a8d685-ed01-4b10-9f50-fe9ad0c9c0c1",
        },
      },
    ],
  },
];
```
