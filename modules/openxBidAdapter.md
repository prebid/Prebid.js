# Overview

```
Module Name: OpenX Bidder Adapter
Module Type: Bidder Adapter
Maintainer: team-openx@openx.com
```

# Description

Module that connects to OpenX's demand sources

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            sizes: [[728, 90]],  // a display size
            bids: [
                {
                    bidder: "openx",
                    params: {
                        unit: "539439964",
                        delDomain: "se-demo-d.openx.net"
                    }
                }
            ]
        },
    ];
```
