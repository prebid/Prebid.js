# Overview

Module Name: takeover

Purpose: Let one takeover deal win several ad units of the same auction together, a programmatic page takeover or roadblock.

# Description

A takeover is a set of ordinary per-ad-unit deal bids from the same bidder that share a `dealid` and carry takeover terms in `ext.prebid.deal.takeover`:

```json
{
  "dealid": "TKO-ACME-01",
  "price": 18.00,
  "ext": {
    "prebid": {
      "deal": {
        "type": 3,
        "takeover": {
          "mode": "viewport",
          "min_slots": 3,
          "exclusivity": { "adomain": ["competitor.com"], "cat": ["IAB11-4"] }
        }
      }
    }
  }
}
```

When an auction ends, the module decides whether a takeover wins:

1. Takeovers are ranked against each other first, by priority and then total desirability. At most one wins an auction.
2. On each ad unit, the takeover's bid is compared with the best other bid by priority tier (`bid.priority`, lower wins). It takes ad units where it is in a higher tier and loses ad units where it is in a lower tier.
3. On ad units in the same tier, the takeover wins only if the sum of its bids' desirability beats the sum of the best other bids' desirability, plus the publisher's `premium` and the value of any bids its exclusivity keeps off the page.

Modes:

| Mode | Ad units covered |
| --- | --- |
| `all` | Every ad unit in the auction, or none. Rejected if an ad unit already rendered a bid from an earlier auction. |
| `max` | As many ad units as the takeover wins, at least `min_slots` and the publisher's `minSlotsFloor`. |
| `viewport` | Every ad unit at least `viewportPercent` in view when bids were requested; at least `min_slots`. |

A winning takeover's bids are the only bids left on the ad units it won, and get the `hb_tko=1` targeting key. Bids of takeovers that lose are removed, so a takeover never wins only part of what it bid for.

# Configuration

```javascript
pbjs.setConfig({
  takeover: {
    enabled: true,
    acceptFrom: 'priority',       // 'priority' (default) | 'allowlist' | 'deals'
    acceptFromBidders: [],        // with 'allowlist'
    modes: ['all', 'max', 'viewport'],
    minSlotsFloor: 2,
    premium: 0,
    excludeAdUnits: ['footer'],
    collapseUnfilled: false,
    blockRefresh: false,
    allowExclusivity: false,
    exclusivityLabels: { 'pol-opp': ['IAB11-4'] },
    viewportPercent: 50
  }
});
```

| Setting | Default | Description |
| --- | --- | --- |
| `enabled` | `false` | Turns the module on. |
| `acceptFrom` | `'priority'` | Whose takeovers are acted on: bidders trusted with priority bids (`allowPriorityBids` in `bidderSettings` or `s2sConfig`), the bidders in `acceptFromBidders`, or any bid with a deal ID. |
| `acceptFromBidders` | `[]` | Bidder codes for `acceptFrom: 'allowlist'`. |
| `modes` | `['max']` | Takeover modes the publisher accepts. |
| `minSlotsFloor` | `2` | Takeovers that would win fewer ad units are ignored. |
| `premium` | `0` | Extra margin, as a fraction, a takeover must beat other bids by within a priority tier. |
| `excludeAdUnits` | `[]` | Ad units never taken over. |
| `collapseUnfilled` | `false` | In `all` mode, leave ad units the takeover has no bid for empty instead of rejecting the takeover. |
| `blockRefresh` | `false` | Skip `requestBids` for ad units that rendered a takeover bid. |
| `allowExclusivity` | `false` | Let takeovers keep the advertisers and categories in their `exclusivity` out of the ad units they did not bid on. |
| `exclusivityLabels` | `{}` | Maps `hb_excl` targeting values to IAB categories, so the ad server can apply competitive exclusions. |
| `viewportPercent` | `50` | Percentage of an ad unit's element that must be in view for `viewport` mode. |

# Ad server setup

- Use GPT single-request mode, so the ad server sees every ad unit at once.
- Target dedicated line items to `hb_tko=1` at a priority above price priority and AdX, so the ad server does not split the takeover.
- If you restrict targeting keys with `targetingControls.allowTargetingKeys`, add `hb_tko` (and `hb_excl` if you use exclusivity labels).

# Analytics

Each winning bid keeps its own CPM, and its `meta.deal.takeover.groupId` ties it to the rest of the takeover. The module emits a `takeoverResult` event for every takeover in an auction:

```javascript
pbjs.onEvent('takeoverResult', ({ groupId, auctionId, bidderCode, dealId, mode, won, reason, adUnitCodes, totalCpm }) => {});
```

`reason` is set when the takeover lost: `outranked`, `notEnoughSlots`, `lostOnValue`, `slotAlreadyRendered` or `nothingInView`.
