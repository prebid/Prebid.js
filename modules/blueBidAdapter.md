# Overview

Module Name: Blue Bidder Adapter
Module Type: Bidder Adapter
Maintainer: celsooliveira@getblue.io

# Description

Module that connects to Blue's demand sources.

# Test Parameters
```
    var adUnits = [
        {
            code: 'banner-ad-div',
            sizes: [[300, 250], [728, 90]],
            bids: [
                {
                    bidder: 'blue',
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
