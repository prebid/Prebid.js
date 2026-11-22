# Overview

```
Module Name: goadserver Bidder Adapter
Module Type: Bidder Adapter
Maintainer: jan@goadserver.com
```

# Description

Prebid.js adapter for the goadserver platform — a self-hosted, multi-tenant ad serving stack with a built-in OpenRTB 2.5 Prebid Server endpoint.

One adapter serves every goadserver deployment. The specific ad server to route bids to is passed per-ad-unit via `params.host`, and the publisher's SSP campaign authentication token (generated in the goadserver panel) is passed via `params.token`. Publishers running multiple goadserver instances can mix and match them in a single Prebid.js config by setting different `params.host` values on different ad units.

Supported media types: `banner`, `video`, `native`.

# Bid Parameters

| Name     | Scope    | Description                                                                                                                       | Example               | Type     |
| -------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------- | -------- |
| `host`   | required | The goadserver deployment's public domain. The adapter POSTs to `https://{host}/openrtb2/auction`.                                 | `"ads.example.com"`   | `string` |
| `token`  | required | SSP campaign authentication token from the publisher's goadserver panel. Goes into `site.publisher.id`.                            | `"a1b2c3d4..."`       | `string` |
| `floor`  | optional | Per-bid CPM floor (USD). Honored only if the Price Floors module hasn't already set `imp.bidfloor`.                                | `0.50`                | `number` |
| `subid`  | optional | Per-impression sub-identifier for stats attribution (page section, article bucket, A/B test group, etc.). Emitted as `imp.ext.goadserver.subid` and logged against the bid in goadserver's reporting. Normalized server-side (stripped of `,\|"'` and capped at 1024 chars). | `"article_page"`      | `string` |
| `deals`  | optional | Array of private marketplace deal objects attached to this impression. Each entry maps to OpenRTB `imp.pmp.deals[]`: `id` (required), `bidfloor`, `bidfloorcur`, `at` (auction type), `wseat[]` (whitelisted seats), `wadomain[]` (whitelisted advertiser domains). Forwarded verbatim to downstream DSPs; winning bids return with `bid.dealid` which Prebid.js surfaces in `bid.dealId` for GAM line-item targeting. | see below             | `Object[]` |
| `outstreamRendererUrl` | optional | Override URL for the outstream video renderer script. Defaults to `https://{host}/prebid-outstream.js`, which every goadserver deployment hosts. Set this if you want to self-host or bundle a custom player script. | `"https://cdn.pub.example.com/my-outstream.js"` | `string` |

## Deals / Private Marketplace

```js
bids: [{
  bidder: 'goadserver',
  params: {
    host: 'ads.example.com',
    token: 'your-sspcampaigns-hash',
    deals: [
      { id: 'DEAL_XYZ', bidfloor: 2.50, bidfloorcur: 'USD' },
      { id: 'DEAL_ABC', bidfloor: 1.00, at: 1, wseat: ['agency-42'] }
    ]
  }
}]
```

## Outstream Video

Outstream is supported via the standard `mediaTypes.video.context: 'outstream'` setting. When a video bid is returned for an outstream ad unit, the adapter attaches a Prebid.js `Renderer` that loads the goadserver-hosted outstream player (served at `https://{params.host}/prebid-outstream.js`). The player parses the VAST XML, injects a muted auto-playing `<video>` element into the slot, and fires impression / click trackers. No publisher-side renderer configuration is required.

Publishers who prefer to bundle their own outstream player can override the hosted script via `params.outstreamRendererUrl`, or fall back to defining a standard ad-unit-level `renderer` which takes precedence over the adapter's default.

```js
adUnit = {
  code: 'outstream-1',
  mediaTypes: {
    video: {
      context: 'outstream',
      playerSize: [[640, 360]],
      mimes: ['video/mp4']
    }
  },
  bids: [{
    bidder: 'goadserver',
    params: {
      host: 'ads.example.com',
      token: 'your-token'
      // outstreamRendererUrl: 'https://cdn.pub.example.com/my-outstream.js' // optional override
    }
  }]
};
```

# Test Parameters

```js
const adUnits = [
  {
    code: "top-banner",
    mediaTypes: {
      banner: {
        sizes: [[728, 90], [970, 250]]
      }
    },
    bids: [
      {
        bidder: "goadserver",
        params: {
          host: "ads.example.com",
          token: "your-sspcampaigns-hash",
          floor: 0.50
        }
      }
    ]
  },
  {
    code: "preroll",
    mediaTypes: {
      video: {
        context: "instream",
        playerSize: [[640, 480]],
        mimes: ["video/mp4"]
      }
    },
    bids: [
      {
        bidder: "goadserver",
        params: {
          host: "ads.example.com",
          token: "your-sspcampaigns-hash"
        }
      }
    ]
  },
  {
    code: "native-1",
    mediaTypes: {
      native: {
        title: { required: true },
        image: { required: true },
        sponsoredBy: { required: true }
      }
    },
    bids: [
      {
        bidder: "goadserver",
        params: {
          host: "ads.example.com",
          token: "your-sspcampaigns-hash"
        }
      }
    ]
  }
];
```

# Multi-Deployment Example

Two ad units auctioned against two different goadserver deployments in one request:

```js
pbjs.addAdUnits([
  {
    code: "slot-a",
    mediaTypes: { banner: { sizes: [[300, 250]] } },
    bids: [{
      bidder: "goadserver",
      params: { host: "deployment1.example.com", token: "token-a" }
    }]
  },
  {
    code: "slot-b",
    mediaTypes: { banner: { sizes: [[728, 90]] } },
    bids: [{
      bidder: "goadserver",
      params: { host: "deployment2.example.com", token: "token-b" }
    }]
  }
]);
```

# Consent & Privacy

The adapter honors Prebid.js's standard consent plumbing (`ortbConverter` handles it): GDPR (`regs.ext.gdpr`, `user.ext.consent`), US Privacy (`regs.ext.us_privacy`), GPP (`regs.gpp` + `regs.gpp_sid`), and COPPA (`regs.coppa`). No bidder-specific consent handling is required on the publisher side.

**GVL ID note:** the goadserver adapter is not yet registered with the IAB Global Vendor List. EU publishers using CMPs that enforce GVL may see bid requests dropped pre-auction until the registration is filed at https://iabeurope.eu/tcf/.
