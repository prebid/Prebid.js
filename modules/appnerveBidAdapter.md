# Overview

```
Module Name: Appnerve Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@appnerve.com
```

# Description

Connects Prebid.js publishers to Appnerve Exchange over OpenRTB 2.6. Supports
banner, video, native and audio. Each ad unit is sent as its own request to
`https://exchange.appnerve.net/openrtb2/auction`. Publishers only supply their
Appnerve `sourceId` (`placementId` is accepted as an alias).

Bids are gross (`netRevenue: false`) in USD. Floors, first party data,
supply chain, user IDs and GDPR, USP, GPP and COPPA signals are passed through
in the standard OpenRTB fields. The adapter does not do user syncs.

# Bid Params

| Name          | Scope                                   | Description                 | Example                  | Type     |
|---------------|-----------------------------------------|-----------------------------|--------------------------|----------|
| `sourceId`    | required (unless `placementId` is set)  | Appnerve Exchange source ID | `'appnerve-test-banner'` | `string` |
| `placementId` | optional                                | Alias of `sourceId`         | `'appnerve-test-banner'` | `string` |

# Test Parameters

The source IDs below are permanent test sources. They always return a
non-billable test bid with an Appnerve sample creative.

```javascript
var adUnits = [
  {
    code: 'test-banner',
    mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } },
    bids: [{ bidder: 'appnerve', params: { sourceId: 'appnerve-test-banner' } }]
  },
  {
    code: 'test-video',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 360]],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
        minduration: 5,
        maxduration: 30
      }
    },
    bids: [{ bidder: 'appnerve', params: { sourceId: 'appnerve-test-video' } }]
  },
  {
    code: 'test-native',
    mediaTypes: {
      native: {
        ortb: {
          ver: '1.2',
          assets: [
            { id: 1, required: 1, title: { len: 90 } },
            { id: 2, required: 1, img: { type: 3, wmin: 300, hmin: 250 } },
            { id: 3, required: 0, data: { type: 2 } }
          ]
        }
      }
    },
    bids: [{ bidder: 'appnerve', params: { sourceId: 'appnerve-test-native' } }]
  },
  {
    code: 'test-audio',
    mediaTypes: {
      audio: { mimes: ['audio/mpeg'], protocols: [2, 3, 5, 6], minduration: 5, maxduration: 30 }
    },
    bids: [{ bidder: 'appnerve', params: { sourceId: 'appnerve-test-audio' } }]
  }
];
```
