# Overview

```
Module Name: Peak226 Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@edge226.com
```

# Description

Connects to the Peak226 SSP for banner, video (instream and outstream) and native demand.

The adapter speaks OpenRTB 2.6 and is built on Prebid's `ortbConverter`, so sizes, price
floors (Price Floors module), user IDs (`ortb2.user.ext.eids`), supply chain
(`ortb2.source.ext.schain`), first-party data (`ortb2` / `ortb2Imp`) and consent signals
(TCF EU, US Privacy, GPP, COPPA) are forwarded automatically. Requests are routed to a
per-data-center endpoint (`us`, `eu` or `jp`); bids are net revenue in USD.

Multiformat ad units are supported: banner, video and native may be declared on the same ad
unit, all declared formats are sent on a single impression, and Peak226 may bid on any of them.

Outstream video requires a publisher-supplied renderer (`mediaTypes.video.renderer` or the
ad unit `renderer`); Peak226 returns VAST and does not host a renderer of its own.

Peak226 does not perform user syncs.

# Bid Params

| Name          | Scope    | Type     | Description                                                              | Example     |
|---------------|----------|----------|--------------------------------------------------------------------------|-------------|
| `publisherId` | required | `string` | Your Peak226 publisher/account ID.                                       | `'pub-123'` |
| `placementId` | required | `string` | Placement ID for this ad unit.                                           | `'plc-456'` |
| `region`      | optional | `string` | Data center to send the request to: `'us'`, `'eu'` or `'jp'`. Default `'us'`. | `'eu'`      |

# Test Parameters

```javascript
// Instream video bids are returned as VAST XML and need a cache:
// pbjs.setConfig({ cache: { url: 'https://prebid.adnxs.com/pbc/v1/cache' } });

var adUnits = [
  {
    code: 'test-banner',
    mediaTypes: {
      banner: { sizes: [[300, 250], [728, 90]] }
    },
    bids: [{
      bidder: 'peak226',
      params: { publisherId: 'pub-test', placementId: 'plc-test' }
    }]
  },
  {
    code: 'test-video',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 480]],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
        api: [2],
        plcmt: 1
      }
    },
    bids: [{
      bidder: 'peak226',
      params: { publisherId: 'pub-test', placementId: 'plc-test' }
    }]
  },
  {
    code: 'test-native',
    mediaTypes: {
      native: {
        ortb: {
          assets: [
            { id: 1, required: 1, title: { len: 80 } },
            { id: 2, required: 1, img: { type: 3, w: 300, h: 250 } }
          ]
        }
      }
    },
    bids: [{
      bidder: 'peak226',
      params: { publisherId: 'pub-test', placementId: 'plc-test', region: 'eu' }
    }]
  }
];
```
