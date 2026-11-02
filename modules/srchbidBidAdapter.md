# Overview

```
Module Name: Srchbid Bidder Adapter
Module Type: Bidder Adapter
Maintainer: info@bidtags.com
```

# Description

Connects web banner inventory to Srchbid. Contact <info@bidtags.com> for onboarding
and an assigned zone ID. The adapter returns publisher-net CPM in USD.

| Parameter | Required | Type | Description |
| --- | --- | --- | --- |
| `zone` | Yes | string or number | Zone ID assigned by Srchbid. |
| `lifecycleSignals` | No | boolean | Defaults to `true`. Set `false` to disable optional win/render diagnostics while retaining bidding and creative delivery. |

Only banner web inventory is supported. A multiformat ad unit is handled as a
banner opportunity. Each opportunity produces one HTTPS POST to
`https://prebid.searchplan.co/prebid/bid`. No external runtime code, user sync,
cookie or browser storage is added by this adapter.

OpenRTB request context and impression context supplied by Prebid are preserved,
including supply chain, transaction IDs and privacy fields. The adapter passes
TCF, USP and GPP signals when supplied; forwarding signals does not by itself
establish a vendor's regulatory registration or downstream compliance. No GVL ID
is declared. Publishers must configure their consent and activity controls.

# Optional lifecycle diagnostics

The adapter can send separate HTTPS GET requests to
`https://bid.searchplan.co/display-lifecycle/win/...` and
`https://bid.searchplan.co/display-lifecycle/render/...`, using only URLs returned
by Srchbid for the same bid. They report Srchbid's own win and render events, not
other bidders' results, viewability or completed execution of third-party scripts.
They do not bill the impression. Financial delivery tracking remains in the
winning creative. Set `params.lifecycleSignals: false` to suppress both callbacks;
this does not suppress the auction or creative delivery tracking.

# Configuration example

```javascript
var adUnits = [{
  code: 'banner-slot',
  mediaTypes: { banner: { sizes: [[300, 250]] } },
  bids: [{ bidder: 'srchbid', params: { zone: '200007' } }]
}];
```

# Test parameters

The example above uses the active review zone `200007`, connected to Base banner
campaigns. Supported test sizes are 300x250, 320x50, 728x90, 300x600 and 160x600.
A matching banner is selected for each request; the artwork can vary.

Review page: https://prebid.searchplan.co/srchbid-review

Allowed HTTPS hostnames: `prebid.searchplan.co`, `docs.prebid.org`, `prebid.org`,
`www.prebid.org` and `prebid.github.io`. Contact <info@bidtags.com> to authorize
another review hostname. The gateway requires the actual page origin to match
the request's site.page. Normal delivery accounting applies to this review zone.
No trial limit is enabled on the zone; connected Base campaigns retain their
existing budgets and CPM. Use an assigned production zone when onboarding.
