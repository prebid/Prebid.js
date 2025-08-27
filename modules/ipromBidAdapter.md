# Overview

```
Module Name: Iprom PreBid Adapter
Module Type: Bidder Adapter
Maintainer: support@iprom.si
```

# Description

Module that connects to Iprom's demand sources

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],  // a display size
                }
            },
            bids: [
                {
                    bidder: "iprom",
                    params: {
                        id: '1234',
                        dimension: '300x250'
                    }
                }
            ]
        }
    ];
```
