#Overview

```
Module Name: Orbidder Bid Adapter
Module Type: Bidder Adapter
Maintainer: orbidder@otto.de
```

# Description

Module that connects to orbidder demand sources

# Test Parameters
```
var adUnits = [{
    code: '/105091519/bidder_test',
    mediaTypes: {
        banner: {
            sizes: [728, 90]
        }
    },
    bids: [{
        bidder: 'orbidder'
        params: {
            accountId: "someAccount",
            placementId: "somePlace"
        }
    }]
}];
```
