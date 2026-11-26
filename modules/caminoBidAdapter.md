# Overview

```
Module Name: Camino Bid Adapter
Module Type: Bidder Adapter
Maintainer: tech@camino-labs.com
```

# Description

Module that connects to Camino's demand sources. Supports banner and video.
Built with manual OpenRTB request construction.

- Supported media types: **banner**, **video** (instream, or outstream with a
  publisher-defined renderer; requires `playerSize`, `context`, `mimes` and
  `protocols`). A banner+video ad unit sends its banner. Banners are bid on
  fixed sizes only: ratio-only formats (`wratio`/`hratio`) are not bid on.
- Privacy: GDPR (TCF, IAB Europe GVL vendor ID 1670), US Privacy (CCPA), GPP, COPPA
- Supply chain (schain): supported
- User IDs (eids): supported
- Floors: via the Price Floors module, resolved per media type and size
  (lowest floor sent as `imp.bidfloor` with `bidfloorcur`)
- User syncs: iframe preferred, image pixel as fallback
- Banner slot signals in `imp.banner.ext`: `viewability` (percent-in-view) and
  `scrollOffset` (pixels of scrolling left until the slot enters the viewport;
  the slot element is resolved via GPT when the div id differs from the ad unit code)
- Frequency signals in `imp.ext`: `bidRequestCount`, `bidderRequestCount`,
  `bidderWinCount` (Prebid's per-ad-unit counters for the page view)
- Session signals in `ext.session`: `refreshCount` (auctions already run this
  page view) and `id` (persisted in the `camino_sid` localStorage key via
  Prebid's consent-gated storage manager)

# Storage

The adapter stores one key, `camino_sid` (a random UUID), in localStorage via
Prebid's storage manager, so it is only written when storage is allowed. It is
sent with bid requests (`ext.session.id`) and user syncs (`sid`), so Camino's
sync server can link a user sync to the bid requests from the same browser.
Bid requests also carry Camino's cookie, but browsers that block third-party
cookies (such as Safari) drop it; this id lets the synced user IDs still be
matched there. Disclosed in
`metadata/disclosures/modules/caminoBidAdapterDisclosure.json`.

# Bid Params

| Name          | Scope    | Description                 | Example        | Type     |
| ------------- | -------- | --------------------------- | -------------- | -------- |
| `publisherId` | required | Camino publisher identifier | `'1122334455'` | `string` |
| `placementId` | optional | Camino placement identifier | `'12345'`      | `string` |

# Test Parameters

```js
var adUnits = [
  // Banner
  {
    code: "banner-div",
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
        bidder: "camino",
        params: {
          publisherId: "1122334455",
          placementId: "12345",
        },
      },
    ],
  },
  // Video (instream)
  {
    code: "video-div",
    mediaTypes: {
      video: {
        context: "instream",
        playerSize: [[640, 480]],
        mimes: ["video/mp4"],
        protocols: [2, 3, 5, 6],
        api: [2],
        maxduration: 30,
      },
    },
    bids: [
      {
        bidder: "camino",
        params: {
          publisherId: "1122334455",
          placementId: "12345",
        },
      },
    ],
  },
];
```
