# Overview

```
Module Name: Adhouse Bid Adapter
Module Type: Bidder Adapter
Maintainer: dev@adhouse.pro
```

# Description

Connects to the Adhouse bidder for banner and instream video demand via OpenRTB.
Adhouse serves its own direct-sold campaigns. The adapter posts one OpenRTB
request to `https://bid.adhouse.pro/openrtb2/auction` and maps the response back
to Prebid bids with the shared ortbConverter library.

Bids are always in USD (`cur: "USD"`). A line item priced in TRY is converted
server-side before the response; publishers do not send a TRY CPM. Enable the
currency module if the ad server currency is not USD.

First-party data, the supply chain, COPPA and the US Privacy string are taken
from `bidderRequest.ortb2` by ortbConverter. There is no GVL ID, so this adapter
does not participate in TCF auctions in the EU. There is no user-sync pixel.

A hosted MP4 is returned as an InLine VAST document. A third-party VAST tag is
returned as a VAST Wrapper. Native is not offered by this adapter.

# Bid Params

| Name          | Scope    | Description                                                      | Example            | Type             |
|---------------|----------|------------------------------------------------------------------|--------------------|------------------|
| `placementId` | required | Adhouse ad unit id                                               | `'12345'`          | `string`/`number`|
| `bidfloor`    | optional | Static CPM floor, used only when the floors module is absent    | `0.50`             | `number`         |
| `currency`    | optional | Currency of the static `bidfloor`. Defaults to USD               | `'USD'`            | `string`         |
| `videoType`   | optional | `standart_video` or `sticky_video`. Omit to allow either player  | `'standart_video'` | `string`         |

`standart_video` is spelled that way because it is the ad unit field name.

# Test Parameters

Placement `999999` always returns a deterministic test creative. The banner
response is HTML. The video response is a VAST 3.0 InLine document. Both bids
are in USD.

```js
var adUnits = [
  {
    code: 'test-banner',
    mediaTypes: {
      banner: { sizes: [[300, 250]] }
    },
    bids: [{
      bidder: 'adhouse',
      params: {
        placementId: '999999'
      }
    }]
  },
  {
    code: 'test-video',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 360]],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6]
      }
    },
    bids: [{
      bidder: 'adhouse',
      params: {
        placementId: '999999'
      }
    }]
  }
];
```
