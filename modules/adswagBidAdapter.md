# Overview

```
Module Name: Adswag Bid Adapter
Module Type: Bidder Adapter
Maintainer: prebid@adswag.ai
```

# Description

Connects a Prebid.js auction to the Adswag bid endpoint: directly integrated
European supply, hosted in the EU, IAB TCF vendor 1417. Supports **banner**,
**video** (instream, and outstream with a bundled renderer) and **audio**
(`mediaTypes.audio`, or `ortb2Imp.audio` on a video-typed unit), including
mixed-format ad units. TCF and GPP consent strings are forwarded. Bids are
in EUR.

# Bid Parameters

| Name          | Scope    | Type   | Description                                                                                   | Example               |
|---------------|----------|--------|-----------------------------------------------------------------------------------------------|-----------------------|
| `publisherId` | required | String | Your Adswag publisher id.                                                                     | `"pub-nl-news-1"`     |
| `placementId` | optional | String | Names the placement. Omit it and the placement is discovered from GPID or the ad unit code.   | `"plc-homepage-mrec"` |
| `bidFloor`    | optional | Number | Floor in EUR, used when the Prebid Price Floors module is not configured.                     | `0.50`                |
| `video`       | optional | Object | Overrides for `mediaTypes.video` params.                                                      | `{ maxduration: 15 }` |
| `kv`          | optional | Object | Key/values for this ad unit, sent as `imp.ext.data`. Values are strings, numbers, or arrays of those. | `{ section: "sport" }` |
| `endpoint`    | optional | String | Endpoint override for Adswag test environments. Honored for `adswag.ai` hosts only.          | `"https://bid.dev.adswag.ai/prebid/bid"` |

Set a GPID (`ortb2Imp.ext.gpid`) on your ad units where you can. It names
the placement reliably across ad unit renames.

# Key/values

Send first-party data the standard Prebid way and the adapter forwards it:

- **Page and content:** `ortb2.site.ext.data` and `ortb2.site.content.data[]`.
- **Ad unit:** `ortb2Imp.ext.data`, or the `kv` bid param. Both are sent as
  `imp.ext.data`, 32 keys max; `kv` wins when a key is in both.
- **User:** `ortb2.user.data[]` and `ortb2.user.ext.data`, forwarded with
  identity consent, like eids.

Declare each key in your Adswag account before you send it.

# Endpoint override

`params.endpoint`, or `pbjs.setConfig({ adswag: { endpoint } })`, points
the adapter at an Adswag test environment. It is honored for hosts on the
`adswag.ai` domain only; other hosts fall back to the production endpoint.

# Test Parameters

The `prebid-test` publisher always returns test creatives: a 300x250
banner, a 20 s instream video and a 30 s audio spot. Test bids are in
EUR.

```javascript
var adUnits = [
  // Banner ad unit
  {
    code: "test-banner-div",
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [{
      bidder: "adswag",
      params: {
        publisherId: "prebid-test",
        placementId: "prebid-test-display"
      }
    }]
  },
  // Video ad unit (instream)
  {
    code: "test-video-div",
    mediaTypes: {
      video: {
        context: "instream",
        playerSize: [[640, 360]],
        mimes: ["video/mp4"],
        minduration: 5,
        maxduration: 30,
        protocols: [2, 3, 7, 8]
      }
    },
    bids: [{
      bidder: "adswag",
      params: {
        publisherId: "prebid-test",
        placementId: "prebid-test-video"
      }
    }]
  },
  // Audio ad unit
  {
    code: "test-audio-div",
    mediaTypes: {
      audio: {
        mimes: ["audio/mpeg", "audio/mp4"],
        minduration: 10,
        maxduration: 30,
        protocols: [2, 3, 7, 8]
      }
    },
    bids: [{
      bidder: "adswag",
      params: {
        publisherId: "prebid-test",
        placementId: "prebid-test-audio"
      }
    }]
  }
];
```

# Outstream Video

Ad units with `mediaTypes.video.context: "outstream"` get the Adswag
renderer attached to the winning bid. It loads from `player.adswag.ai` when
an Adswag bid wins, plays the returned VAST in the ad unit's div, starts
muted with a click-to-unmute control, and collapses the slot when the ad
ends.

To use your own player, set a `renderer` on the ad unit or on
`mediaTypes.video.renderer`. A renderer marked `backupOnly: true` keeps the
Adswag renderer.

```javascript
{
  code: "test-outstream-div",
  mediaTypes: {
    video: {
      context: "outstream",
      playerSize: [[640, 360]],
      mimes: ["video/mp4"],
      minduration: 5,
      maxduration: 30,
      protocols: [2, 3, 7, 8]
    }
  },
  bids: [{
    bidder: "adswag",
    params: {
      publisherId: "prebid-test",
      placementId: "prebid-test-video"
    }
  }]
}
```

# User Syncs

The adapter registers one iframe or image sync per auction on
`ev.adswag.ai`, following your `userSync` configuration and consent. Enable
iframe syncing for better match rates:

```javascript
pbjs.setConfig({
  userSync: {
    filterSettings: {
      iframe: {
        bidders: ["adswag"],
        filter: "include"
      }
    }
  }
});
```

# GDPR / TCF

Adswag is IAB Europe GVL vendor **1417**; add it to your CMP. With consent,
the adapter forwards eids from Prebid userId modules and keeps an Adswag
first-party id (`adswag_uuid`, eid source `adswag.ai`) through Prebid's
StorageManager, respecting `deviceAccess` and TCF Purpose 1. Without
consent, traffic is served contextually.
