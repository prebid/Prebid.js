# Overview

```
Module Name:  LuponMedia Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   info@luponmedia.com
```

# Description

LuponMedia bid adapter. Each ad unit sends an integration `key` issued by LuponMedia. All bids are
returned under the `luponmedia` bidder code.

# Parameters

| Name  | Scope    | Description | Example |
|-------|----------|-------------|---------|
| `key` | required | Integration key from LuponMedia | `"acme"` |

A key is lowercase letters, digits, `-` and `_`, with parts separated by dots.

# Multiple bids

The adapter may return several bids per ad unit, highest CPM first, under the `luponmedia` bidder
code.

Without extra config, Prebid sends only the highest `luponmedia` bid per ad unit to the ad server
(`hb_pb_luponmedia`). To send more, enable Prebid's `multibid` module:

```js
pbjs.setConfig({
  multibid: [{ bidder: 'luponmedia', maxBids: 3, targetBiddercodePrefix: 'lupon' }]
});
```

The 2nd and 3rd bids then get their own targeting keys (`hb_pb_lupon2`, `hb_pb_lupon3`, ...), which
need matching line items in the ad server.

# Outstream video and native

A video or native ad unit needs its own key from LuponMedia.

- **Video: outstream only** (`mediaTypes.video.context: 'outstream'`). Instream ad units are not sent.
  Bids carry the VAST XML and play in Prebid's outstream renderer (`ANOutstreamVideo.js`) inside the
  ad unit's div (the div id must be the ad unit code), unless the ad unit sets its own `renderer`.
- **Native**: the usual Prebid `mediaTypes.native` (`ortb` request or the legacy asset list); Prebid
  renders it with the page's native template or through the ad server. Event trackers and placement
  type are added when the page leaves them out.

```js
var adUnits = [{
  code: 'div-outstream',
  mediaTypes: {
    video: {
      context: 'outstream',
      playerSize: [[640, 360]],
      mimes: ['video/mp4', 'video/webm'],
      protocols: [2, 3, 5, 6, 7, 8],
      plcmt: 4,
      maxduration: 30,
      playbackmethod: [6]
    }
  },
  bids: [{ bidder: 'luponmedia', params: { key: 'acme.acme-outstream' } }]
}, {
  code: 'div-native',
  mediaTypes: {
    native: {
      ortb: {
        assets: [
          { id: 1, required: 1, title: { len: 90 } },
          { id: 2, required: 1, img: { type: 3, wmin: 300, hmin: 157 } },
          { id: 3, required: 1, data: { type: 1 } }
        ]
      }
    }
  },
  bids: [{ bidder: 'luponmedia', params: { key: 'acme.acme-native' } }]
}];
```

# Test Parameters

```js
var adUnits = [{
  code: 'div-mpu',
  mediaTypes: { banner: { sizes: [[300, 250]] } },
  bids: [{
    bidder: 'luponmedia',
    params: { key: 'dev' }
  }]
}];
```
