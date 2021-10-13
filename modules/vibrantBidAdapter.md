# Overview

```
Module Name: Vbrant Bidder Adapter
Module Type: Bidder Adapter
Maintainer: kormorantdev@vibrantmedia.com
```

# Description

Module that allows the Kormorant Client to perform prebid bid details prior to fetching and displaying ads.

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
                    bidder: "example",
                    params: {
                        placement: '12345'
                    }
                }
            ]
        },{
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[320, 50]],   // a mobile size
                }
            },
            bids: [
                {
                    bidder: "example",
                    params: {
                        placement: 67890
                    }
                }
            ]
        }
    ];
```