# Overview

```
Module Name: Bucksense Bidder Adapter
Module Type: Bidder Adapter
Maintainer: stefano.dechicchis@bucksense.com
```

# Description

Use `bucksense` as bidder.

`placementId` is required, use the Placement ID received by Bucksense.


Module that connects to Example's demand sources

## AdUnits configuration example
```
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
                    bidder: "bucksense",
                    params: {
                        placementId : 1000
                    }
                }
            ]
        }
    ];
```