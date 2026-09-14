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

Supported media types: `banner`, `video`, `native`.

The ad server names the format it filled on each bid's `mtype`, so a mixed ad unit is offered whole
and answered with whichever the ad server had demand for. Video comes back as VAST in `adm`; native
as an OpenRTB native response, with each asset carried under the id the page asked it under.

Which slot a placement can fill is decided on the ad server, by the placement's own type — a Video
Placement answers video impressions, a Native Placement native ones. A slot whose placement is of a
different type than the ad unit declares is simply not filled.

## Instream video needs a cache setting

Prebid refuses an instream bid that carries only `vastXml` with no `cache` configured, and it does
so before the bid reaches `bidsBackHandler` — so the ad server answers correctly and the slot still
reports no bid, with the reason only in the console. Set one of:

```js
pbjs.setConfig({ cache: { allowVastXmlOnly: true } });  // player takes VAST as a string
pbjs.setConfig({ cache: { useLocal: true } });          // player wants a URL, cached in the browser
pbjs.setConfig({ cache: { url: '…' } });                // Prebid Cache — required for Google Ad Manager
```

`allowVastXmlOnly` is enough for a player that accepts a VAST document directly, which IMA and JW
both do. A hosted Prebid Cache is only required when the ad server is rendered through Google Ad
Manager, which builds its VAST tag around `hb_uuid`.

The same parameters are accepted by the Prebid Server adapter, which posts to `https://{{.Host}}/hb/bid` on the host the PBS host company configures.

## Bid TTL

Bids default to a **25-second** TTL — short, because the ad server stops accepting a bid's impression beacon after that window, and a creative rendered from cache past it would serve without being counted. It is a default, not a ceiling: a deployment configured with a wider window says so per bid in `bid.exp`, which takes precedence.

## Deals

The ad server stamps `dealid` on the bids it returns for a deal-backed line item; the adapter surfaces it as `bid.dealId`, which Prebid exposes as the `hb_deal_epom_as` targeting key. A Google Ad Manager Sponsorship line item keyed on that value is the supported way to have an Epom direct bid outrank the rest of the stack rather than compete with it on price alone.

## Advertiser domains

Epom Ad Server does not currently populate `seatbid[].bid[].adomain`, so `bid.meta.advertiserDomains` is left unset rather than filled with a placeholder. Brand-safety line items and analytics that key on advertiser domain will not match Epom bids until the ad server starts sending it; the adapter forwards the field unchanged as soon as it does.

## Device storage

The adapter uses no storage manager and writes nothing to cookies or `localStorage`. It does send the request with credentials, so an Epom identity cookie previously set by the ad server on its own domain reaches the auction — the ad server answers with the request's own `Origin` rather than a wildcard. That cookie is disclosed in the device-storage disclosure published for IAB TCF Global Vendor List ID **849**, declared on the adapter as `disclosureURL`. There is no cross-domain user sync: `getUserSyncs` deliberately registers nothing.

# Bid Parameters

| Name           | Scope    | Description                                                                                                                   | Example                | Type     |
|----------------|----------|-------------------------------------------------------------------------------------------------------------------------------|------------------------|----------|
| `host`         | required | Serving host of the publisher's Epom Ad Server deployment, as a bare hostname with an optional port — no scheme, path or query. The adapter POSTs to `https://{host}/hb/bid`. | `'ads.example.com'`    | `string` |
| `placementKey` | required | Placement identifier, copied from the placement's invocation-code tab in the Epom UI. Sent as `imp.tagid`.                     | `'a4f21c9e7b'`         | `string` |
| `channel`      | optional | Epom channel — a publisher traffic-slice label used for channel targeting and reporting. Sent as `imp.ext.epom_as.channel`. An empty value is ignored. | `'sports-uk'`        | `string` |
| `customParams` | optional | Epom custom parameters, for custom targeting and creative macros. Values must be strings, numbers or booleans; they are stringified and merged into `imp.ext.data`, where keys already on the impression win. The ad server applies its own ingest limits on top (at most 32 keys, keys to 128 and values to 512 characters) and ignores anything beyond them. | `{section: 'sport'}` | `object` |
| `bidFloor`     | optional | CPM floor for this impression, applied only when no floor has already been resolved — a value from the Price Floors module always wins. `0` means no floor. | `0.50`                 | `number` |
| `bidFloorCur`  | optional | Currency of `bidFloor`, as an ISO-4217 code. Defaults to `USD`.                                                                | `'EUR'`                | `string` |

A bid whose parameters violate the table above is rejected by `isBidRequestValid` and never leaves the page — the same input the Prebid Server params schema rejects.

# Test Parameters

Live placements on an Epom Ad Server demo deployment that always fill, one per media type, for
verifying the adapter end to end. Each key is a placement of that type on the same host, since the ad
server decides what a placement may answer from its own type.

```js
const adUnits = [
  {
    code: "test-div",
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [
      {
        bidder: "epom_as",
        params: {
          host: "aj2494.online",
          placementKey: "63bad7a99f270394e7b4b370952cbff2"
        }
      }
    ]
  },
  {
    code: "test-video",
    mediaTypes: {
      video: {
        context: "instream",
        playerSize: [[640, 480]],
        mimes: ["video/mp4"],
        protocols: [2, 3, 5, 6]
      }
    },
    bids: [
      {
        bidder: "epom_as",
        params: {
          host: "aj2494.online",
          placementKey: "7659fd47e17263ba6ae1de3c9e137c74"
        }
      }
    ]
  },
  {
    code: "test-native",
    mediaTypes: {
      native: {
        ortb: {
          assets: [
            { id: 1, required: 1, title: { len: 90 } },
            { id: 2, required: 1, img: { type: 3, w: 1200, h: 627 } },
            { id: 3, required: 0, img: { type: 1, w: 128, h: 128 } },
            { id: 4, required: 0, data: { type: 1, len: 50 } }
          ]
        }
      }
    },
    bids: [
      {
        bidder: "epom_as",
        params: {
          host: "aj2494.online",
          placementKey: "f4dd0f413d5c4f8d8c515f8a999e038f"
        }
      }
    ]
  }
];
```

The video unit needs one of the cache settings above, or Prebid discards the bid before it reaches
`bidsBackHandler`.

The optional parameters, on a deployment of your own. `host` is a bare hostname —
the adapter posts to `https://{host}/hb/bid` — and every ad unit naming the same
host travels in one request:

```js
const adUnits = [
  {
    code: "leaderboard",
    mediaTypes: { banner: { sizes: [[728, 90], [970, 250]] } },
    bids: [{
      bidder: "epom_as",
      params: {
        host: "ads.example.com",
        placementKey: "a4f21c9e7b",
        channel: "sports-uk",
        customParams: { section: "sport" }
      }
    }]
  },
  {
    code: "sidebar",
    mediaTypes: { banner: { sizes: [[300, 250]] } },
    bids: [{
      bidder: "epom_as",
      params: {
        host: "ads.example.com",
        placementKey: "6d0e83b415",
        bidFloor: 0.50,
        bidFloorCur: "EUR"
      }
    }]
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

The adapter registers IAB TCF Global Vendor List ID **849** and relies on Prebid.js's standard consent plumbing via `ortbConverter`: GDPR (`regs.ext.gdpr`, `user.ext.consent`), US Privacy (`regs.ext.us_privacy`), GPP (`regs.gpp`, `regs.gpp_sid`) and COPPA (`regs.coppa`) are forwarded to the ad server unchanged, without bidder-specific configuration.

First-party data set through `pbjs.setConfig({ortb2})`, `pbjs.setBidderConfig` and an ad unit's `ortb2Imp` is forwarded as-is, as are the EIDs written by the User ID modules (`user.ext.eids`).
