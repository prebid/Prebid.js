# Overview

```
Module Name: NexBids Bidder Adapter
Module Type: Bidder Adapter
Maintainer: tangyongchun@tingxue.net
```

# Description

Connects to the NexBids SSP gateway (OpenRTB 2.6) to fetch banner, video and native demand.

The adapter sends one OpenRTB request per publisher to the NexBids gateway. The gateway
authenticates the page by its `Origin`, resolves the publisher and ad units against its registry,
enriches IP / geo / user-agent server side, and returns the winning bid per impression with all
price macros already substituted. Win / billing notifications are relayed by the gateway; the
adapter only fires the signed billing pixel handed down in the response when the ad renders. For
video and native the gateway also writes the same pixel into the creative (VAST `<Impression>`,
native `eventtrackers`), so players and native renderers count the impression themselves; the
gateway de-duplicates it.

# Media Types

- **banner**: `mediaTypes.banner.sizes`.
- **video**: `mediaTypes.video` with a `playerSize`; the standard OpenRTB video fields (`mimes`,
  `protocols`, `minduration`, `maxduration`, `plcmt`, ...) are forwarded as declared, and the gateway
  fills `mimes` / `protocols` / `linearity` only when they are missing. Both `instream` and
  `outstream` contexts are accepted; the adapter ships no renderer, so outstream ad units need a
  publisher-supplied `renderer`.
- **native**: `mediaTypes.native` (ORTB native request); bids come back as `native.ortb`. The click
  beacon is appended to `link.clicktrackers`.
- **multi-format** ad units bid on one format: the gateway takes the first of banner, video, native
  that the registered ad unit allows.

# Bid Parameters

| Name          | Scope    | Description                                                    | Example                    | Type     |
|---------------|----------|----------------------------------------------------------------|----------------------------|----------|
| `publisherId` | required | Publisher ID assigned by NexBids                               | `'Pub-0b526ce787990f10'`   | `string` |
| `adUnitCode`  | required | Ad unit code registered in the NexBids console (`imp.tagid`)   | `'Unit-290705e08f54235d'`  | `string` |

# Configuration

```javascript
pbjs.setConfig({
  nexbids: {
    env: 'test',                     // 'prod' (default) or 'test' (NexBids staging gateway)
    endpoint: 'https://test.ssp.nexbids.com' // optional origin override for a gateway you run locally; wins over env
  }
});
```

# Test Parameters

All test ad units are registered on the NexBids staging gateway under one test publisher, so set
`env: 'test'` first. The staging gateway accepts pages served from `localhost`, so the parameters
below can be run from a local Prebid.js build. The exchange paces demand, so an individual request
may come back with no bid; refresh a few times if that happens.

```javascript
pbjs.setConfig({ nexbids: { env: 'test' } });

var bannerAdUnit = {
  code: 'div-nexbids-320x50',
  mediaTypes: {
    banner: {
      sizes: [[320, 50]]
    }
  },
  bids: [{
    bidder: 'nexbids',
    params: {
      publisherId: 'Pub-0b526ce787990f10',
      adUnitCode: 'Unit-290705e08f54235d'
    }
  }]
};

var videoAdUnit = {
  code: 'div-nexbids-video',
  mediaTypes: {
    video: {
      context: 'instream',
      playerSize: [[640, 360]],
      mimes: ['video/mp4'],
      protocols: [2, 3, 5, 6],
      plcmt: 1
    }
  },
  bids: [{
    bidder: 'nexbids',
    params: {
      publisherId: 'Pub-0b526ce787990f10',
      adUnitCode: 'Unit-be8c8a038eff93af'
    }
  }]
};

var nativeAdUnit = {
  code: 'div-nexbids-native',
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
    bidder: 'nexbids',
    params: {
      publisherId: 'Pub-0b526ce787990f10',
      adUnitCode: 'Unit-528a4e084e3436dc'
    }
  }]
};
```

# Notes

- The exchange's viewability measurement runs inside the creative and needs a same-origin
  (friendly) iframe to measure the host viewport. Rendering through a SafeFrame or any other
  cross-origin frame makes the creative report itself as fully viewable.
- `publisherId` is an identifier, not a secret; the gateway authorises requests by the page's
  `Origin` / `Referer` against the publisher's registered domains.
