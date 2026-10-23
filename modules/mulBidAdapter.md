# Overview

```markdown
Module Name: Mul Bidder Adapter
Module Type: Bidder Adapter
Maintainer: business@responsiq.com
```

# Description

The Mul (MonetiseUp) bidder adapter connects publishers directly to MonetiseUp's header bidding marketplace, aggregating demand from top programmatic SSPs and DSPs including Adagio, PubMatic, OpenX, 152Media, Nobid, OnlineMediaSolutions, Scalibur, TripleLift, Eskimi, and Equativ.

# Test Parameters

```javascript
var adUnits = [
  {
    code: 'test-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]]
      }
    },
    bids: [
      {
        bidder: 'mul',
        params: {
          placementId: 'test-placement-123'
        }
      }
    ]
  }
];
```

# User Sync and Device Storage Disclosure

When user syncing is enabled in Prebid (`userSync.filterSettings`), the adapter triggers user synchronization via the endpoint `https://bid5up.monetiseup.com/api/usersync`.

- **Sync Types**: Supports `iframe` and `image` (pixel) syncs.
- **Privacy Controls**: All consent signals (`gdpr`, `gdpr_consent`, `us_privacy`, `gpp`, `gpp_sid`) are attached to user sync requests.
- **Device Storage**: The sync endpoint sets a first-party/third-party synchronization identifier cookie (`mu_uid`) on the MonetiseUp bidding domain for cookie matching across integrated DSPs. The adapter does not access or read `localStorage` or `document.cookie` directly from the publisher page.

