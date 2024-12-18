# Overview

Module Name: bms Bidder Adapter
Module Type: Bidder Adapter
Maintainer: celsooliveira@getbms.io

# Description

Module that connects to bms's demand sources.

# Test Parameters

```
    var adUnits = [
        {
            code: 'banner-ad-div',
            sizes: [[300, 250], [728, 90]],
            bids: [
                {
                    bidder: 'bms',
                    params: {
                        publisherId: "xpto",
                        bidFloor: 0.5,
                        currency: "USD",
                        placementId: "xpto",
                    }
                }
            ]
        }
    ];
```
