# Overview

```
Module Name: Adswag Bid Adapter
Module Type: Bidder Adapter
Maintainer: prebid@adswag.ai
```

# Description

Module that connects a Prebid.js auction to the Adswag bid endpoint — directly
integrated European (EU-hosted, TCF vendor 1417) supply. Supports **banner**,
**video** (instream, and outstream with a bundled renderer) and **audio**
(`mediaTypes.audio`, or `ortb2Imp.audio` on a video-typed unit), including
mixed-format ad units.

TCF and GPP consent strings are forwarded to the endpoint; consentless
traffic is served contextually (no identifier is read, written, or
forwarded). The adapter is fail-open in every path: any error degrades to a
clean no-bid and never blocks the page or the auction.

# Bid Parameters

| Name          | Scope    | Type   | Description                                                                                   | Example               |
|---------------|----------|--------|-----------------------------------------------------------------------------------------------|-----------------------|
| `publisherId` | required | String | Adswag publisher id (issued at onboarding). Resolves the canonical publisher at the edge.     | `"pub-nl-news-1"`     |
| `placementId` | optional | String | Explicit placement override. Omit to let Adswag discover the placement from GPID/adUnitCode.  | `"plc-homepage-mrec"` |
| `bidFloor`    | optional | Number | Static floor (EUR) used only when the Prebid Price Floors module is not configured.           | `0.50`                |
| `video`       | optional | Object | Overrides for `mediaTypes.video` ad-unit params (Prebid video-params convention).             | `{ maxduration: 15 }` |
| `kv`          | optional | Object | Impression-scoped publisher key/values (string, number, or array of those per key). Mapped into `imp.ext.data`. Keys must be declared in the publisher's key-space registry; undeclared keys are dropped at the edge as `kv.undeclared`. | `{ section: "sport" }` |
| `endpoint`    | optional | String | Endpoint override for Adswag-operated test/staging environments — see the constraint below.  | `"https://bid.dev.adswag.ai/prebid/bid"` |

Placement identity is publisher-id-only by design: supply the standardized
GPID (`ortb2Imp.ext.gpid`) or rely on the `adUnitCode`, and Adswag discovers
and curates the placement. Hand-maintained placement ids are not required.

# Publisher key/values

Publishers can send declared first-party key/values on every auction:

- **Page / content (contextual):** set Prebid first-party data on
  `ortb2.site.ext.data`, `ortb2.app.ext.data`, and `ortb2.site.content.data[]`
  (including `ext.segtax`). The adapter forwards these with the site/app
  object.
- **Impression (contextual):** set `ortb2Imp.ext.data.<key>`, and/or
  `params.kv`. The adapter merges them into `imp.ext.data` (existing
  `ortb2Imp.ext.data` first, then `params.kv`, insertion order, capped at 32
  keys). Reserved names (`adunitcode`, `pbadslot`, `adserver`, `gpid`,
  `tid`, `adswag`, `kv`, `ukv`) are never overwritten.
- **User (personal):** set `ortb2.user.data[]` and/or `ortb2.user.ext.data`.
  Forwarded only when identity consent permits (the same gate as eids);
  otherwise omitted entirely.

**Declaration required.** Every key must be declared in the publisher's
key-space registry before it is admitted. Undeclared keys are dropped at
the edge with a `kv.undeclared` observation; the auction still bids. Values
are tokens (`[A-Za-z0-9._:/~-]`), not free text.

The adapter is fail-open on this path: a malformed `params.kv` yields a
contextual-only request (placement keys kept, publisher key/values dropped)
and never blocks the bid.

The `endpoint` override (per-bid `params.endpoint`, or globally via
`pbjs.setConfig({ adswag: { endpoint } })`) exists for Adswag-operated
test/staging environments only. It is honored **only** for hosts on the
`adswag.ai` domain (`adswag.ai` or `*.adswag.ai`); any other host is ignored
and the request goes to the built-in production endpoint. Publishers never
need to set it.

# Test Parameters

The `prebid-test` publisher is a permanent test identity: its placements
consistently return test creatives (banner 300x250, 20s instream video,
30s audio). Test bids are returned in **EUR** like all Adswag bids; no
currency configuration is needed to receive them (include the Prebid
currency module if your ad-server currency is not EUR).

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

Ad units declaring `mediaTypes.video.context: "outstream"` get an Adswag
renderer attached to the winning bid automatically — no configuration, and
nothing is downloaded unless an Adswag outstream bid actually wins. The
renderer script is served from `player.adswag.ai`; it plays the returned VAST
in the ad unit's div, starts muted with a click-to-unmute control, and
collapses the slot when the ad completes, errors, or no ad is available.

To use your own player instead, supply a renderer on the ad unit
(`renderer: { url, render }`) or on `mediaTypes.video.renderer` as usual —
the adapter then attaches nothing. A publisher renderer marked
`backupOnly: true` keeps the Adswag renderer, per Prebid convention.

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

User syncs are registered via `getUserSyncs` only (one iframe or image sync
per auction, on `ev.adswag.ai`), honoring the publisher `userSync`
configuration and GDPR/GPP/USP consent. No sync is registered for
consentless traffic. Enable iframe syncing for improved match rates:

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

Adswag is IAB Europe GVL vendor **1417** (`gvlid: 1417` is declared in the
adapter). Ensure your CMP includes vendor 1417; when GDPR applies without
vendor-1417 consent, traffic is served contextually. With consent, the
adapter forwards eids from Prebid userId modules and maintains an Adswag
first-party id (`adswag_uuid`, eid source `adswag.ai`) through Prebid's
StorageManager — respecting `deviceAccess` and TCF purpose-1 enforcement.
Storage use is declared in the IAB GVL device-storage disclosure for
vendor 1417.
