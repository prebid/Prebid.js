# Overview

```
Module Name: Geniee Exchange Bid Adapter
Module Type: Bidder Adapter
Maintainer: aladdin-back@geniee.co.jp
```

# Description

This is the [Geniee](https://geniee.co.jp) Exchange Bid Adapter (bidder code
`ex_geniee`) for Prebid.js. It POSTs an OpenRTB bid request to the Geniee Exchange,
where the publisher's `partnerId` is carried as the `id` query parameter and the optional
`placementId` as `imp.tagid`.

Geniee maintains three separate bid adapters; this one is independent of the other two and can
be used alongside them:

- `ex_geniee`: Geniee Exchange (this adapter), `partnerId` based
- `ssp_geniee`: Geniee SSP, `zoneId` based
- `dsp_geniee`: Geniee DSP

Please contact us before using the adapter.

Supported media types: **banner** and **video**. Bids whose ad unit declares neither
`mediaTypes.banner` nor `mediaTypes.video` (for example native-only ad units) are rejected by
`isBidRequestValid` and never reach the Exchange. A multiformat ad unit (banner + video) is sent
as one `imp` carrying both `banner` and `video`; native and audio are never sent. See
[Video](#video) for the video requirements.

We will provide ads when the following conditions are satisfied:

- The request is a banner request whose ad unit declares valid sizes, or a video request that
  meets the [Video](#video) requirements
- Payment is possible in Japanese yen or US dollars (see [Currency](#currency))
- The request contains either `site` (with `site.page`) or `app` (with `app.bundle`).
  `site` is normally auto-filled by Prebid's first-party-data enrichment; when the payload ends
  up with neither section, or with a `site` lacking `page` / an `app` lacking `bundle`, no
  request is sent
- GDPR does not apply to the request. The Exchange does not serve GDPR territories, so consent
  signals are not forwarded and no request is sent when GDPR applies

# Bid Parameters

| Name          | Scope    | Type      | Description                                                                                                                                                                                                                                                                                                                                                 |
|---------------|----------|-----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `partnerId`   | required | `Integer` | The single per-publisher ID issued by Geniee. Must be an integer >= 1 (number only; string forms such as `'123'` are rejected). Sent as the `id` query parameter.                                                                                                                                                                                           |
| `currency`    | optional | `String`  | ISO-4217 currency code, `JPY` or `USD`. When omitted, the currency module's `adServerCurrency` is used, then `USD` (see [Currency](#currency)).                                                                                                                                                                                                             |
| `placementId` | optional | `String`  | Reporting label for the ad unit, defined by the supply partner (not issued by Geniee). Use a fixed value per ad unit; if omitted, Geniee reports cannot be broken down by ad unit. Alphanumeric, hyphen and underscore, max 40 characters, case-insensitive (`Sidebar` = `sidebar`). Sent as `imp.tagid`; the adapter requires a non-empty string when set, while the format rules are validated by the Exchange, not by the adapter. |

# Test Parameters

> **Note:** `partnerId` values are publisher-specific and are issued by Geniee. A generic value
> will not return bids. Please contact aladdin-back@geniee.co.jp to obtain one.

```javascript
var adUnits = [
    {
        code: 'ex-geniee-test-ad',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [336, 280]]
            }
        },
        bids: [
            {
                bidder: 'ex_geniee',
                params: {
                    partnerId: 123,              // required, integer >= 1 issued by Geniee (a number, not '123')
                    placementId: 'top-banner_1'  // optional reporting label, fixed per ad unit
                }
            }
        ]
    },
    {
        // Instream video: requires Prebid Cache, e.g.
        // pbjs.setConfig({ cache: { url: 'https://my-pbs.example.com/cache' } });
        code: 'ex-geniee-test-instream',
        mediaTypes: {
            video: {
                context: 'instream',
                playerSize: [[640, 480]],
                mimes: ['video/mp4'],
                plcmt: 1,
                minduration: 5,
                maxduration: 30,
                protocols: [2, 3, 5, 6]
            }
        },
        bids: [
            {
                bidder: 'ex_geniee',
                params: {
                    partnerId: 123
                }
            }
        ]
    },
    {
        // Outstream video: the publisher supplies the renderer.
        code: 'ex-geniee-test-outstream',
        mediaTypes: {
            video: {
                context: 'outstream',
                playerSize: [[640, 360]],
                mimes: ['video/mp4']
            }
        },
        renderer: {
            url: 'https://publisher.example.com/outstream-player.js',
            render: function (bid) {
                // hand bid.vastXml to the player loaded from the url above
            }
        },
        bids: [
            {
                bidder: 'ex_geniee',
                params: {
                    partnerId: 123
                }
            }
        ]
    }
];
```

## Video

| `mediaTypes.video` field                  | Scope       | Notes                                                              |
|-------------------------------------------|-------------|--------------------------------------------------------------------|
| `mimes`                                   | required    | Non-empty array of MIME types.                                     |
| `playerSize`                              | recommended | Sent as `imp.video.w`/`imp.video.h`.                               |
| `plcmt`                                   | recommended | Passed to demand partners as is; the Exchange does not fill it in. |
| `minduration`, `maxduration`, `protocols` | recommended | Some demand partners require them.                                 |

- When the video part of an ad unit cannot be sent (no `mimes`, or a `mimes` entry, including
  one set in `bids[].ortb2Imp.video.mimes`, that is not a string), a multiformat ad unit is
  sent as banner only, and a video-only ad unit is rejected by `isBidRequestValid`.
- Video is sent only for ad units that declare `mediaTypes.video`. A video set up through
  `ortb2Imp.video` alone is not sent: the adapter drops that `imp.video` and sends the banner
  part, if any.
- Instream: bids are VAST XML, so
  [Prebid Cache](https://docs.prebid.org/dev-docs/show-video-with-a-dfp-video-tag.html) is
  required.
- Outstream: Geniee does not provide a renderer. Publishers must set up their own; see
  [Show Outstream Video Ads](https://docs.prebid.org/dev-docs/show-outstream-video-ads.html).
- Size of a video bid: only when the response carries both `w` and `h` does the bid keep them.
  Otherwise (neither, or only one of them) the adapter sets both `width` and `height` to the
  requested player size (`playerSize`), so that a response size is never mixed with the player
  size.

## Currency

`cur` is resolved as `params.currency`, then the currency module's `adServerCurrency`, then
`USD` (the default). If the resolved currency is neither `JPY` nor `USD` (for example
`adServerCurrency: 'EUR'`), no request is sent, the same strict policy as the `ssp_geniee`
adapter. The adapter itself never converts currencies.

## User Sync

On a winning response the Exchange returns a single cookie-sync URL at
`ext.usersync.iframe`, which the adapter registers through `getUserSyncs` as an iframe sync.
No sync is registered on a no-bid, and only the iframe type is supported: the one iframe
document carries the sync tags of every demand partner, so a single iframe covers them all
without hitting Prebid's `syncsPerBidder` cap.

Prebid disables iframe syncs by default, so publishers must allow them for this bidder:

```javascript
pbjs.setConfig({
    userSync: {
        filterSettings: {
            iframe: {
                bidders: ['ex_geniee'],
                filter: 'include'
            }
        }
    }
});
```

### Device storage

The adapter itself does not read or write publisher-domain (first-party) storage. All storage
is on Geniee's own domains, `*.genieesspv.jp` and `*.gssprt.jp`: bid requests are sent with
credentials, so Geniee's `gid` user-identifier cookie accompanies them, and the sync iframe
above stores the matched identifiers and sync-state markers of the Exchange's demand partners.
The full inventory (cookie names, domains, lifetimes and TCF purposes) is declared in the TCF
device-storage disclosure at <https://genieesspv.jp/disclosure.json>, referenced from the
adapter via `disclosureURL`. Geniee is not registered in the IAB Global Vendor List because
the Exchange does not serve GDPR territories (no request is sent when GDPR applies, see
[Description](#description)).

## Example Bid Request

For the banner ad unit above (`ex-geniee-test-ad`), the adapter POSTs the following OpenRTB bid
request (JSON body) to `https://aladdin.genieesspv.jp/yie/ld/exchange?id=123`.
`params.placementId` travels in the payload as `imp[].tagid` (absent when the param is
omitted).

`site` and `device` are filled automatically by Prebid.js first-party-data enrichment from the
actual page and browser, `imp[].id` and `tmax` are generated per auction, and `id` is composed
as `<bidderRequestId>-<imp[0].id>`. The values below are an illustrative capture.

```json
{
  "id": "c0dc3a43-85b5-44f2-b5b5-df1aa5f7e5d8-2ab03f1234e1b6",
  "at": 1,
  "cur": ["USD"],
  "test": 0,
  "tmax": 1500,
  "imp": [
    {
      "id": "2ab03f1234e1b6",
      "secure": 1,
      "tagid": "top-banner_1",
      "banner": {
        "topframe": 0,
        "format": [
          { "w": 300, "h": 250 },
          { "w": 336, "h": 280 }
        ],
        "w": 300,
        "h": 250
      }
    }
  ],
  "site": {
    "domain": "publisher.example.com",
    "page": "https://publisher.example.com/article/123",
    "ref": "https://www.google.com/",
    "publisher": {
      "domain": "publisher.example.com"
    }
  },
  "device": {
    "w": 1920,
    "h": 1080,
    "dnt": 0,
    "ua": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
    "language": "ja",
    "sua": {
      "source": 1,
      "platform": { "brand": "macOS" },
      "browsers": [
        { "brand": "Chromium", "version": ["150"] },
        { "brand": "Google Chrome", "version": ["150"] }
      ],
      "mobile": 0
    },
    "ext": { "vpw": 1920, "vph": 1080 }
  }
}
```

For the instream ad unit (`ex-geniee-test-instream`), `imp` carries `video` instead of `banner`
(and no `tagid`, as `placementId` is not set); the other fields are built the same way:

```json
"imp": [
  {
    "id": "3bc14e2345f2c7",
    "secure": 1,
    "video": {
      "mimes": ["video/mp4"],
      "plcmt": 1,
      "minduration": 5,
      "maxduration": 30,
      "protocols": [2, 3, 5, 6],
      "w": 640,
      "h": 480
    }
  }
]
```

## Notes

- One HTTP request per ad unit: the Exchange requires the `imp` array to have length exactly
  1, so ad units are not batched into a single payload. The payloads of one auction share a
  common prefix (`id` is `<bidderRequestId>-<impId>`), so the Exchange can group the split
  requests of an auction and tell which imp each one carries.
- The Exchange requires `banner.w`/`banner.h`, which the adapter derives from the first size in
  `banner.format`.
- Media type of a bid: taken from `seatbid[].bid[].mtype` in the response (`1` = banner,
  `2` = video), for banner-only ad units too. The Exchange always sets `mtype`; a bid without
  it is dropped.
- Floors (banner and video alike): the Exchange reads only `imp.bidfloor`. With the Price
  Floors module, the adapter sets it to the lowest floor among the media types sent in the
  `imp` (banner / video); if any of them has no floor, `imp.bidfloor` is the one set in the ad
  unit's `ortb2Imp`, or none when it has none. If looking up the floors fails (`getFloor`
  throws), `imp.bidfloor` is left as the Price Floors module itself set it.
- Auction type: the Exchange runs a first price auction and Prebid.js does not populate `at`,
  so the adapter defaults it to `1`. If the publisher forces any other value through `ortb2`,
  no request is sent for that ad unit.
- The request is sent with `withCredentials: true`, so browser cookies accompany it; the
  Exchange responds with credentialed CORS headers.
- User IDs collected by Prebid userId modules (for example ID5), when configured on the page,
  are injected into first-party data as `user.ext.eids` (Prebid normalizes EIDs to that ORTB
  2.5 location and drops `user.eids`). The Exchange reads the ORTB 2.6 location, so the adapter
  mirrors them into `user.eids`; `user.ext.eids` is left in place as well.
- A no-bid is returned as HTTP 204 with an empty body; the adapter then returns no bids.
- Bid TTL is 3600 seconds.
