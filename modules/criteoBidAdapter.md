# Overview

Module Name: Criteo Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@criteo.com

# Description

Module that connects to Criteo's demand sources.

# Test Parameters
```
    var adUnits = [
        {
            code: 'banner-ad-div',
            sizes: [[300, 250], [728, 90]],
            bids: [
                {
                    bidder: 'criteo',
                    params: {
                        zoneId: 497747
                    }
                }
            ]
        }
    ];
```

# Additional Config (Optional)

Criteo Bid Adapter supports the collection of the user's hashed email, if available.

Please consider passing it to the adapter, following [these guidelines](https://publisherdocs.criteotilt.com/prebid/#hashed-emails).
