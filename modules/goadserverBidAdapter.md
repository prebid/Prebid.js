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
