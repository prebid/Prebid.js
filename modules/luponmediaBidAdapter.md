# Overview

```
Module Name: LuponMedia Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@luponmedia.com
```

# Description

Module that connects to LuponMedia's demand sources

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]]
                }
            },
            bids: [
                {
                    bidder: "luponmedia",
                    params: {
                        keyId: 'uid@test_12345'
                    }
                }
            ]
        }
    ];
```
