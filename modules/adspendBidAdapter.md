# Overview

```
Module Name: AdSpend Bidder Adapter
Module Type: Bidder Adapter
Maintainer: gaffoonster@gmail.com
```

# Description

Connects to AdSpend bidder.
AdSpend adapter supports only Banner at the moment. Video and Native will be add soon.

# Test Parameters
```
    var adUnits = [
        // Banner
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]]
                }
            },
            bids: [
                {
                    bidder: "adspend",
                    params: {
                        placement: 'test-ad',
                        tagId: 'test'
                    }
                }
            ]
        }
    ];
```
