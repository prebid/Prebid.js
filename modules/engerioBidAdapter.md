# Overview

```
Module Name: Engerio Bidder Adapter
Module Type: Bidder Adapter
Maintainer: info@thinkeasy.cz
```

# Description

Engerio is a publisher-focused ad server. Publishers register ad slots in the
Engerio admin and receive an `adUnitCode` string to use as the bid parameter.
The adapter communicates via OpenRTB 2.5.

Supported media types: **banner**

# Bid Parameters

| Name | Scope | Type | Description |
|---|---|---|---|
| `adUnitCode` | required | String | The ad slot identifier configured in the Engerio admin for this placement. |

# Test Parameters

> **Note:** `adUnitCode` values are publisher-specific and must be registered in
> the Engerio admin before use. A generic code will not return bids. Contact
> [info@thinkeasy.cz](mailto:info@thinkeasy.cz) to obtain a test `adUnitCode`.

```javascript
var adUnits = [
  {
    code: 'div-banner-300x250',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [
      {
        bidder: 'engerio',
        params: {
          adUnitCode: 'test-slot-300x250'  // replace with a valid adUnitCode from your Engerio account
        }
      }
    ]
  }
];
```


## Supported Media Types

- `banner`

## Viewability

Engerio records viewable impressions from the verdict your Prebid.js already produces — it
does not measure viewability itself. To enable it, include **either** module in your build and
switch it on:

```javascript
// IntersectionObserver based; needs no ad server.
pbjs.setConfig({ bidViewabilityIO: { enabled: true } });

// Or, if you serve through GAM, Active View via GPT:
pbjs.setConfig({ bidViewability: { enabled: true } });
```

With one of them enabled the adapter's `onBidViewable` handler fires Engerio's `vurl`, and the
bid also carries a standard `eventtrackers` entry (`event: 2`, viewable) that Prebid fires
itself — either route is sufficient, and the endpoint is idempotent.

The adapter reports which of these is active in the bid request, so Engerio can tell "measured,
not viewed" apart from "not measured at all". **With neither module enabled, viewable
impressions are reported as unavailable rather than as zero** — no bids are lost either way.

## First-party data

The adapter forwards first-party data that Prebid has already assembled:

- page and user level, from `ortb2` (`site.content.data`, `user.data`, and anything else set
  there);
- ad unit level, from each ad unit's `ortb2Imp`, merged into that impression.

The adapter's own fields (`imp.id`, `imp.ext.adUnitCode`, `imp.banner.format`) take precedence
over anything `ortb2Imp` sets for the same key. Note that under TCF enforcement Prebid may
strip user first-party data before it reaches any bidder — that is expected and does not
affect bidding.

## Sizes

Every size in the ad unit's `mediaTypes.banner.sizes` is sent, and Engerio returns a bid at one
of them. A creative is only served into a size whose aspect ratio it already matches, so ads
are scaled but never stretched; where no creative fits any requested size, Engerio returns no
bid rather than a distorted ad.

## Win Notification

Engerio uses the OpenRTB `nurl` field for win notifications. When Prebid.js
renders the winning ad it calls `onBidWon`, which routes a `GET` request to the
`nurl` URL through Prebid's core ajax helper. This triggers impression recording and budget deduction on the
Engerio server — no additional publisher-side configuration is needed.

## Supply Chain

The adapter forwards the supply chain object as `source.ext.schain`, reading it from
`ortb2.source.ext.schain` (current Prebid.js) or the legacy per-bid `schain` field.

Engerio's seller ids are published at
[https://api.engerio.sk/sellers.json](https://api.engerio.sk/sellers.json). The node for this
bidder uses `asi: 'api.engerio.sk'` and the publisher's own seller id as `sid` — the same id
that goes into the publisher's `ads.txt` line (`api.engerio.sk, <seller id>, DIRECT`). Engerio
checks the last node of the chain against the seller id that owns the ad slot.

## Notes

- Requests are sent without credentials (`withCredentials: false`).
- Auction payloads are JSON-serialized and sent as `text/plain` to avoid CORS preflights.
- The adapter passes `site.page` and `site.domain` from Prebid.js `refererInfo`
  for contextual targeting.
- `device.ua` is forwarded from Prebid.js normalized request data when available.
- `device.w`/`device.h` are forwarded when present and used for device targeting, falling back
  to the user agent.
- Consent signals set in `ortb2` (`regs.ext.gdpr`, `user.ext.consent`, GPP) are forwarded
  unchanged.
- When no bid is returned, the response carries a standard OpenRTB `nbr` reason code and a
  per-impression `ext.nobid` detail, which the adapter logs at info level. This is a debugging
  aid for diagnosing an unfilled slot; no publisher configuration is involved.
- Bid TTL is 300 seconds.
