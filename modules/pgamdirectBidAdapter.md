# Overview

```
Module Name:  PGAM Direct Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   [email protected]
```

# Description

Server-to-server OpenRTB 2.6 adapter from PGAM Media — direct supply-side
platform with dynamic floors, transparent margins, and supply-chain
integrity. Multi-region endpoint at `https://rtb.pgammedia.com/rtb/v1/auction`.

Companion modules merged in the same release series:
- `pgamdirectAnalyticsAdapter` — analytics events
- (cookie sync handled via `getUserSyncs` in this adapter)

Bidder code: `pgamdirect`. GVL Vendor ID: 1353 (PGAM Media LLC).

# Bid Params

| Name          | Scope    | Description                                                              | Example              | Type     |
|---------------|----------|--------------------------------------------------------------------------|----------------------|----------|
| `orgId`       | required | The publisher's PGAM organisation slug, assigned at onboarding           | `"acme-publisher"`   | `string` |
| `placementId` | required | Slot reference; lands on `imp.tagid`                                     | `"homepage-leader"`  | `string` |

# Sample Ad Unit

```javascript
var adUnits = [{
  code: "div-leaderboard",
  mediaTypes: { banner: { sizes: [[728, 90], [300, 250]] } },
  bids: [{
    bidder: "pgamdirect",
    params: {
      orgId: "acme-publisher",
      placementId: "homepage-leader"
    }
  }]
}];
```

# Privacy + Consent

- TCF v2.2 — adapter forwards consent strings; PGAM Media LLC is registered
  as GVL Vendor ID 1353.
- GPP — supported for `tcfeu`, `usnat`, `usstate_all`.
- US Privacy / CCPA — passed through unchanged.
- COPPA — honoured; suppresses the request when the COPPA flag is set on a
  publisher's inventory.
