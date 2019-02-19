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
                    sizes: [[300, 250]],
                }
            },
            bids: [
                {
                    bidder: 'adikteev',
                    params: {
                        adSpaceId: 5084
                    }
                }
            ]
        }
    ];
```
