# Overview

```
Module Name: bid9 Bidder Adapter
Module Type: Bidder Adapter
Maintainer: amit@kolorowey.com, kshitiz@kolorowey.com
```

# Description

Connects to the bid9 exchange for bids over OpenRTB 2.6.

The bid9 adapter supports Banner and Video (instream and outstream). Each ad unit is sent as its own OpenRTB 2.6 request with one impression, routed by the ad unit's bid9 channel ID. Floors, currency, user IDs (`user.eids`, also sent as `user.ext.eids`), consent signals (TCF, USP, GPP, COPPA), schain and first-party data (`ortb2` / `ortb2Imp`) are all sent through Prebid's standard modules, so the adapter needs no extra configuration for them.

# Bid Params

| Name          | Scope    | Description                                                                  | Example       | Type             |
|---------------|----------|------------------------------------------------------------------------------|---------------|------------------|
| `channelId`   | required | bid9 channel ID, provided by your bid9 account manager. Sent as the endpoint's `tagid` and as `imp.tagid`. | `'6a0c1b2d3e4f5a6b7c8d9e0f'` | `string` |
| `publisherId` | optional | bid9 publisher ID. Sent as `site.publisher.id` / `app.publisher.id` unless `ortb2` already sets one. | `'pub-001'`   | `string`         |
| `bidFloor`    | optional | Static floor, used only when the Price Floors Module does not provide one.    | `0.5`         | `number`         |
| `bidFloorCur` | optional | Currency of `bidFloor` (default `USD`).                                       | `'EUR'`       | `string`         |

Demand selection and per-channel settings are managed in the bid9 platform, so in most cases `channelId` is the only parameter a publisher needs.

# Test Parameters


## Banner

```js
var adUnits = [{
  code: 'div-banner',
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [300, 600]]
    }
  },
  bids: [{
    bidder: 'bid9',
    params: {
      channelId: '6ad9d5605c6d395f530e7799'
    }
  }]
}];
```

## Instream video

```js
var adUnits = [{
  code: 'div-video-instream',
  mediaTypes: {
    video: {
      context: 'instream',
      playerSize: [640, 480],
      mimes: ['video/mp4', 'video/webm', 'application/javascript'],
      protocols: [2, 3, 5, 6, 7, 8],
      minduration: 5,
      maxduration: 30,
      startdelay: 0,
      plcmt: 1,
      linearity: 1,
      skip: 1,
      skipafter: 5,
      playbackmethod: [2],
      api: [2, 7]
    }
  },
  bids: [{
    bidder: 'bid9',
    params: {
      channelId: '6ad9d5605c6d395f530e7799'
    }
  }]
}];
```

## Outstream video

bid9 does not provide its own outstream renderer. Configure a renderer on the ad unit, or use a video player integration. Prebid discards outstream bids that have no renderer.

```js
var adUnits = [{
  code: 'div-video-outstream',
  mediaTypes: {
    video: {
      context: 'outstream',
      playerSize: [640, 360],
      mimes: ['video/mp4'],
      protocols: [2, 3, 5, 6],
      plcmt: 4,
      playbackmethod: [6]
    }
  },
  renderer: {
    url: 'https://cdn.example.com/outstream-renderer.js',
    render: function (bid) { /* publisher renderer */ }
  },
  bids: [{
    bidder: 'bid9',
    params: {
      channelId: '6ad9d5605c6d395f530e7799'
    }
  }]
}];
```

# Floors

When the [Price Floors Module](https://docs.prebid.org/dev-docs/modules/floors.html) is installed, its floors are sent as `imp.bidfloor` / `imp.bidfloorcur`. Floors for individual media types and sizes are included where they differ. `params.bidFloor` is used only when the module returns no floor.

# Debugging

The adapter writes to the console only through Prebid's logger. To see bid9 requests, responses, discarded bids, timeouts and HTTP errors, enable debug mode with `?pbjs_debug=true` or `pbjs.setConfig({ debug: true })`. Auction events (`bidRequested`, `bidResponse`, `noBid`, `bidderError`, `bidTimeout`, `bidWon`) are available through `pbjs.getEvents()` and analytics adapters.
