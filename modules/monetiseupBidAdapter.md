# Overview

```markdown
Module Name: MonetiseUp Bidder Adapter
Module Type: Bidder Adapter
Maintainer: business@responsiq.com
```

# Description

The MonetiseUp bidder adapter connects publishers directly to MonetiseUp's header bidding marketplace, aggregating demand from top programmatic SSPs and DSPs including Adagio, PubMatic, OpenX, 152Media, Nobid, OnlineMediaSolutions, Scalibur, TripleLift, Eskimi, and Equativ.

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
        bidder: 'monetiseup',
        params: {
          placementId: 'test-placement-123'
        }
      }
    ]
  }
];
```
