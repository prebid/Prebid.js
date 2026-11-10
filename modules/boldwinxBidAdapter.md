# Overview

```
Module Name: BoldwinX Bidder Adapter
Module Type: Bidder Adapter
Maintainer: info@bold-win.com
```

# Description

Connects to the Boldwin endpoint that the `epid` (endpoint ID) param selects. Supports banner,
video (instream; outstream needs the publisher's own renderer) and native (ORTB native request).

Contact info@bold-win.com to get an `epid`. Every ad unit goes into its own request with one
impression, because the endpoint accepts one impression per request.

Bids are net CPMs in USD. Price floors are sent in USD; a floor in another currency is left
out of the request, and Prebid still enforces it on the bids.

The adapter fills in `${AUCTION_PRICE}` in the markup and in the notice URLs. For video it puts
`burl` and `nurl` into the VAST as `<Impression>` pixels, so the player fires them when the ad
starts, whoever plays it. For banner and native it hands them to Prebid as event trackers:
Prebid fires `burl` when the bid becomes billable and native `nurl` when the bid wins. Banner
markup already carries its `nurl`.

User sync is an image pixel. It carries the GDPR, US Privacy and GPP signals Prebid has, and
no sync is made when COPPA applies.

# Bid Params

| Name   | Scope    | Description                   | Example   | Type                 |
|--------|----------|-------------------------------|-----------|----------------------|
| `epid` | required | Endpoint ID issued by Boldwin | `'12345'` | `string` or `number` |

# Test Parameters

Replace `epid` with the value issued by Boldwin. Instream video bids return VAST XML, so
they need Prebid Cache (`cache: { url: ... }` or `cache: { useLocal: true }`).

```js
var adUnits = [
  // Banner
  {
    code: 'test-banner',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]]
      }
    },
    bids: [{
      bidder: 'boldwinx',
      params: {
        epid: '12345'
      }
    }]
  },
  // Video, instream
  {
    code: 'test-video',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
        plcmt: 1
      }
    },
    bids: [{
      bidder: 'boldwinx',
      params: {
        epid: '12345'
      }
    }]
  },
  // Native
  {
    code: 'test-native',
    mediaTypes: {
      native: {
        ortb: {
          ver: '1.2',
          assets: [
            { id: 1, required: 1, title: { len: 90 } },
            { id: 2, required: 1, img: { type: 3, w: 1200, h: 627 } },
            { id: 3, required: 1, data: { type: 1 } },
            { id: 4, required: 0, data: { type: 2 } }
          ]
        }
      }
    },
    bids: [{
      bidder: 'boldwinx',
      params: {
        epid: '12345'
      }
    }]
  }
];
```
