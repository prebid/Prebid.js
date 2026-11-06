# Overview

```
Module Name: nbads(NexBids) Bidder Adapter
Module Type: Bidder Adapter
Maintainer: tangyongchun@tingxue.net
```

# Description

`nbads(NexBids)` is the Prebid.js adapter for NexBids SSP. Its bidder code is `nbads`.
It connects to the NexBids gateway using OpenRTB 2.6 and supports banner, video, and native.

Requests are grouped by publisher and media format, batching placements of the same format.
The gateway validates the page `Origin`, registered domain, publisher, and placement. It adds
server-side IP, geographic, and device information, selects the winning bid for each impression,
and replaces price macros. The gateway sends upstream win and billing notices.

The adapter sends the signed impression URL from `onBidBillable` through Prebid's shared Ajax
API with `GET`, `keepalive: true`, and `withCredentials: false`. Prebid core deduplicates billing
for the same bid object; the gateway deduplicates repeated tracking requests for an impression.
Video and native creatives also contain the same impression URL for their players or renderers.

# Media formats

- **Banner**: declare dimensions in `mediaTypes.banner.sizes`.
- **Video**: declare player dimensions in `mediaTypes.video.playerSize`. Standard OpenRTB video
  fields are forwarded. Both `instream` and `outstream` are supported; outstream requires a
  publisher-provided `renderer`. The adapter does not supply a player.
  Responses contain `vastXml`. Ad-server delivery requires a configured Prebid video cache.
  A publisher whose own player consumes VAST XML directly can explicitly set
  `pbjs.setConfig({ cache: { allowVastXmlOnly: true } })`, as the demo does.
  Without a cache or an explicit XML-player configuration, Prebid core rejects XML-only bids.
- **Native**: declare assets in `mediaTypes.native.ortb`. Responses use `native.ortb`, with the
  gateway click tracker appended to `link.clicktrackers`.
- **Mixed-format ad units**: each declared format enabled in the build is requested separately,
  allowing all formats to compete without a fixed banner-first preference. Each request contains
  one format. The gateway still enforces the placement's registered format allowlist, and all
  responses remain associated with the original Prebid bid request.

# Bid parameters

| Parameter | Required | Description | Example | Type |
|---|---|---|---|---|
| `publisherId` | When the standard field is absent | Overrides `ortb2.site.publisher.id`, `ortb2.app.publisher.id`, or `ortb2.dooh.publisher.id` | `'Pub-d253acc11ce4b315'` | `string` |
| `adUnitCode` | When the standard field is absent | Overrides `ortb2Imp.tagid`; use the complete registered placement code | `'Unit-59c572bf7ac1ebb1'` | `string` |

Each parameter can be omitted independently when its standard field is present. The resolved
publisher and placement identifiers must be nonempty strings.
For example, set the publisher with
`pbjs.setConfig({ ortb2: { site: { publisher: { id: 'Pub-d253acc11ce4b315' } } } })`
and set `ortb2Imp: { tagid: 'Unit-59c572bf7ac1ebb1' }` on the ad unit. Its bidder entry can then
be `bids: [{ bidder: 'nbads', params: {} }]`.

An OpenRTB response without `cur` defaults to `USD`. Explicit response currencies are preserved.
This response fallback does not override the request floor currency or ad server currency.

# Configuration

```javascript
pbjs.setConfig({
  nbads: {
    env: 'prod' // Use production for Prebid review; this is also the default.
  }
});
```

The fixed HTTPS endpoints are `https://us.nexbids.com` for production and
`https://test.ssp.nexbids.com` for integration testing. Custom endpoints are not supported.

The public bidder code and configuration namespace are `nbads`. The gateway response protocol
continues to use `ext.nexbids.pixel` and `ext.nexbids.click`; NexBids domains and identifiers
retain their existing values.

# Prebid review parameters

Use the production gateway `https://us.nexbids.com` with `nbads.env: 'prod'`.
All three placements belong to publisher `Pub-d253acc11ce4b315`. Placement codes must retain
their `Unit-` prefix.

| Format | Placement | Size or format |
|---|---|---|
| Banner | `Unit-59c572bf7ac1ebb1` | 320x50 |
| Video | `Unit-570416538ad202ef` | 1280x720 |
| Native | `Unit-156842bb1da61c0f` | Responsive image native |

The registered review domain is `test.ssp.nexbids.com`. The page origin must match this
publisher's domain allowlist. These are production parameters; do not switch them to `env: 'test'`.
Demand must also be available in the reviewer's region. HTTP 204 indicates no bid and does not
validate rendering or billing.

```javascript
pbjs.setConfig({ nbads: { env: 'prod' } });

var bannerAdUnit = {
  code: 'div-nbads-320x50',
  mediaTypes: {
    banner: {
      sizes: [[320, 50]]
    }
  },
  bids: [{
    bidder: 'nbads',
    params: {
      publisherId: 'Pub-d253acc11ce4b315',
      adUnitCode: 'Unit-59c572bf7ac1ebb1'
    }
  }]
};

var videoAdUnit = {
  code: 'div-nbads-video',
  mediaTypes: {
    video: {
      context: 'instream',
      playerSize: [[1280, 720]],
      mimes: ['video/mp4'],
      protocols: [2, 3, 5, 6],
      plcmt: 1
    }
  },
  bids: [{
    bidder: 'nbads',
    params: {
      publisherId: 'Pub-d253acc11ce4b315',
      adUnitCode: 'Unit-570416538ad202ef'
    }
  }]
};

var nativeAdUnit = {
  code: 'div-nbads-native',
  mediaTypes: {
    native: {
      ortb: {
        ver: '1.2',
        assets: [
          { id: 1, required: 1, title: { len: 90 } },
          { id: 2, required: 1, img: { type: 3, w: 300, h: 157 } },
          { id: 3, required: 0, data: { type: 2 } }
        ]
      }
    }
  },
  bids: [{
    bidder: 'nbads',
    params: {
      publisherId: 'Pub-d253acc11ce4b315',
      adUnitCode: 'Unit-156842bb1da61c0f'
    }
  }]
};
```

# Integration notes

- Creative viewability measurement requires a same-origin iframe. Do not use SafeFrame or other
  cross-origin creative frames.
- `publisherId` is an identifier, not a secret. The gateway validates the registered domain and
  the page origin.
- NexBids does not currently have an IAB GVL ID and does not declare TCF-EU support. Privacy
  signals, supply chain information, and first-party data use Prebid's standard fields.

Include `nativeRendering` when using `pbjs.renderAd` to render the native template.
Prebid determines when `onBidBillable` runs. To bill only after successful rendering, set
`adUnit.deferBilling: true` and call `pbjs.triggerBilling` after `adRenderSucceeded` for the
current ad. A synchronous render-success event may run before core registers the winning bid;
defer billing to a microtask after the current call stack and verify that the request is still current.
For video, trigger billing when playback begins. Neither `bidWon` nor a general `billableEvent`
proves that the creative was displayed.
