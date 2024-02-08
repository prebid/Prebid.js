# Overview

```
Module Name: Sparteo Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@sparteo.com
```

# Description

Module that connects to Sparteo's demand sources

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [
                        [1, 1]
                    ]
                }
            },
            bids: [
                {
                    bidder: 'sparteo',
                    params: {
                        networkId: '1234567a-eb1b-1fae-1d23-e1fbaef234cf'
                    }
                }
            ]
        }
    ];
```