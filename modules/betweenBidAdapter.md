# Overview

Module Name: Example Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@example.com

# Description

Module that connects to Example's demand sources

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            bids: [
                {
                    bidder: "between",
                    params: {
                        placementId: '12345',
                        w: 200,
                        h: 400,
                        s: 111
                    }
                }
            ]
        }
    ];
```