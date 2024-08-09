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
                    sizes: [[300, 250]],  // a display size
                }
            },
            bids: [
                {
                    bidder: "luponmedia",
                    params: {
                        siteId: 12345,
                        keyId: '4o2c4'
                    }
                }
            ]
        }
    ];
```
