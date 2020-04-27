# Overview

```
Module Name: Emoteev Bidder Adapter
Module Type: Bidder Adapter
Maintainer: engineering@emoteev.io
```

# Description

Module that connects to Emoteev's demand sources

# Test Parameters

``` javascript
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[720, 90]],
                }
            },
            bids: [
                {
                    bidder: 'emoteev',
                    params: {
                        adSpaceId: 5084,
                        context: 'footer',
                        externalId: 42,
                    }
                }
            ]
        }
    ];
```
