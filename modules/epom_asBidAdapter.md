# Overview

```
Module Name: Epom Ad Server Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@epom.com
```

# Description

Prebid.js adapter for the **Epom Ad Server** — the sell-side product of the Epom platform, where a publisher's own direct-sold campaigns are booked and served.

This is a different product from `epom_dsp`, which is the buy side. `epom_dsp` buys impressions on the open market; `epom_as` sells a publisher's own inventory.

Epom Ad Server is white-label: each network runs its own deployment on its own domain, so the serving host is supplied per ad unit via `params.host`. Only the host is configurable — the request path is fixed by the adapter, so a page configuration cannot redirect the auction payload to an arbitrary URL. A page may mix several deployments; the adapter groups impressions by host and sends one request to each.

All ad units on the page are auctioned in a **single request** with one `imp` per ad unit. The ad server resolves the page as a unit, so its roadblock and one-campaign-per-page rules require every slot to be decided together.

Supported media types: `banner`.

# Bid Parameters

| Name           | Scope    | Description                                                                                                                   | Example                | Type     |
|----------------|----------|-------------------------------------------------------------------------------------------------------------------------------|------------------------|----------|
| `host`         | required | Serving host of the publisher's Epom deployment, as a bare hostname. The adapter POSTs to `https://{host}/hb/bid`.             | `"ads.example.com"`    | `string` |
| `placementKey` | required | Placement identifier, copied from the placement's invocation-code tab in the Epom UI. Sent as `imp.tagid`.                     | `"a4f21c9e7b"`         | `string` |
| `channel`      | optional | Epom channel — a publisher traffic-slice label used for channel targeting and reporting. Sent as `imp.ext.epom_as.channel`. | `"sports-uk"`        | `string` |
| `customParams` | optional | Epom custom parameters, for custom targeting and creative macros. Merged into `imp.ext.data`. Scalar values only; at most 32 keys, keys up to 128 and values up to 512 characters. | `{section: 'sport'}` | `object` |
| `bidFloor`     | optional | CPM floor for this impression. Applied only when the Price Floors module has not already resolved `imp.bidfloor`.              | `0.50`                 | `number` |
| `bidFloorCur`  | optional | Currency of `bidFloor`. Defaults to `USD`.                                                                                    | `"EUR"`                | `string` |

# Test Parameters

```js
const adUnits = [
  {
    code: "leaderboard",
    mediaTypes: {
      banner: {
        sizes: [[728, 90], [970, 250]]
      }
    },
    bids: [
      {
        bidder: "epom_as",
        params: {
          host: "ads.example.com",
          placementKey: "a4f21c9e7b"
        }
      }
    ]
  },
  {
    code: "sidebar",
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [
      {
        bidder: "epom_as",
        params: {
          host: "ads.example.com",
          placementKey: "6d0e83b415",
          bidFloor: 0.50
        }
      }
    ]
  }
];
```

# Multiple Deployments

A publisher whose inventory is sold by two Epom networks can run both in the same auction. Each host receives its own request containing only the impressions addressed to it.

```js
pbjs.addAdUnits([
  {
    code: "slot-a",
    mediaTypes: { banner: { sizes: [[300, 250]] } },
    bids: [{
      bidder: "epom_as",
      params: { host: "ads.network-one.com", placementKey: "a4f21c9e7b" }
    }]
  },
  {
    code: "slot-b",
    mediaTypes: { banner: { sizes: [[728, 90]] } },
    bids: [{
      bidder: "epom_as",
      params: { host: "ads.network-two.com", placementKey: "6d0e83b415" }
    }]
  }
]);
```

# Consent and Privacy

The adapter registers IAB TCF Global Vendor List ID **849** and relies on Prebid.js's standard consent plumbing via `ortbConverter`: GDPR (`regs.ext.gdpr`, `user.ext.consent`), US Privacy (`regs.ext.us_privacy`), GPP (`regs.gpp`, `regs.gpp_sid`) and COPPA (`regs.coppa`) are forwarded without bidder-specific configuration.

The adapter sets `withCredentials: false`, so no cookies are sent to the ad server and no user syncs are performed.
