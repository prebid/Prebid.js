# Overview

```
Module Name: RADS Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@recognified.net
```

# Description

RADS Bidder Adapter for Prebid.js 1.x

# Test Parameters
```
    var adUnits = [
        {
            code: "test-div",
            mediaTypes: {
                banner: {
                    sizes: [[320, 50]]
                }
            },
            bids: [
                {
                    bidder: "rads",
                    params: {
                        placement: 3,   // placement ID
                        devMode: true   // if true: library uses dev server for tests
                    }
                }
            ]
        }
    ];
```

Required param field is only `placement`. 

