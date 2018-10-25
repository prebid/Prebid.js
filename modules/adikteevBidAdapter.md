# Overview

```
Module Name: Adikteev Bidder Adapter
Module Type: Bidder Adapter
Maintainer: adnetwork@adikteev.com
```

# Description

Module that connects to Adikteev's demand sources

# Test Parameters

``` javascript
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[750, 200]],  // a display size
                }
            },
            bids: [
                {
                    bidder: 'adikteev',
                    params: {
                        placementId: 12345,
                        bidFloorPrice: 0.1,
                    }
                }
            ]
        }
    ];
```
