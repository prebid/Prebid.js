# Overview

```markdown
Module Name: NexBid Bid Adapter
Module Type: Bidder Adapter
Maintainer: prebid@nexbid.uk
```

# Description

Connects banner inventory to the NexBid bidding endpoint. Production bids are returned only when the NexBid gateway receives a valid buyer-backed response. Configured floors are never converted into bids.

# Test Parameters

The following dedicated parameters return a static 300x250 test creative. The `test` flag is accepted only with the documented NexBid test publisher and placement.

```javascript
var adUnits = [{
  code: 'nexbid-test-300x250',
  mediaTypes: {
    banner: {
      sizes: [[300, 250]]
    }
  },
  bids: [{
    bidder: 'nexbid',
    params: {
      publisherId: 'nexbid-test',
      placementId: 'banner-300x250',
      configId: 'prebid-review',
      test: true
    }
  }]
}];
```

# Publisher Parameters

| Name | Scope | Description | Example | Type |
|---|---|---|---|---|
| `publisherId` | required | NexBid publisher account identifier | `'2606001'` | `string` |
| `placementId` | required | NexBid placement identifier | `'moneycontrol_300x250'` | `string` |
| `configId` | optional | NexBid demand configuration identifier | `'moneycontrol.com'` | `string` |
| `test` | optional | Enables the documented test placement only | `true` | `boolean` |

# Supported Features

- Media type: banner
- Supply chain: read from the standard Prebid bid request
- Floors: read from the Prebid floors API when available
- Privacy: GDPR, USP and GPP values are forwarded to the NexBid gateway
- User sync: none

