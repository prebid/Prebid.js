#Overview

```
Module Name: mabidder Bid Adapter
Module Type: Bidder Adapter
Maintainer: ecdrsvc@
```

# Description

Module that connects to MediaAisle demand sources

# Test Parameters
```
var adUnits = [
    {
        code: 'test_banner',
        mediaTypes: {
            banner: {
                sizes: [728, 90]
            }
        },
        bids: [{
            bidder: 'ecdrsvc',
            params: {
                accountId: "someAccount",
                placementId: "somePlace"
            }
        }],
    }
];
```
