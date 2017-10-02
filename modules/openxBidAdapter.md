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
            sizes: [[300, 250]],  // a display size
            bids: [
                {
                    bidder: "openx",
                    params: {
                        unit: "538958007",
                        delDomain: "se-demo-d.openx.net"
                    }
                }
            ]
        },
    ];
```
