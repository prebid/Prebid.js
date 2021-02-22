# Overview

```
Module Name: Nativo Bid Adapter
Module Type: Bidder Adapter
Maintainer: nativo@nativo.com
```

# Description

Module that connects to Nativo's demand sources

# Dev

gulp serve --modules=nativoBidAdapter

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
                    bidder: "nativo",
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
                    bidder: "nativo",
                    params: {
                        placement: 67890
                    }
                }
            ]
        }
    ];

```
