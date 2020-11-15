# Overview

```
Module Name:  PubWise Bid Adapter
Module Type:  Bidder Adapter
Maintainer: info@pubwise.io
```

# Description

Connects to PubWise exchange for bids.

# Sample Banner Ad Unit: For Publishers

With isTest parameter the system will respond in whatever dimensions provided.

```
var adUnits = [
    {
        code: "banner-div",
        mediaTypes: {
        banner: {
            sizes: [[300, 250]]
        }
        },
        bids: [{
            siteId: "XXXXXX",
            spotId: "12345678",
            isTest: false
        }]
    }
]
```

