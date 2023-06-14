# Overview

```
Module Name: Pubgears Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@pubgears.com
```

# Description

Module that connects to Pubgears's demand sources

# Test Parameters
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
                    bidder: "pubgears",
                    params: {
                        siteId: 11111,
                        tagId: '4a2g4',
                        publisherId: 'rtb1',
                    }
                }
            ]
        }
    ];
```
