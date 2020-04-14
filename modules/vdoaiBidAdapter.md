# Overview

```
Module Name: VDO.AI Bidder Adapter
Module Type: Bidder Adapter
Maintainer: arjit@z1media.com
```

# Description

Module that connects to VDO.AI's demand sources

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]]  // a display size
                }
            },
            bids: [
                {
                    bidder: "vdo.ai",
                    params: {
                        placement: 'newsdv77',
                        bidFloor: 0.01  // Optional
                    }
                }
            ]
        }
    ];
```