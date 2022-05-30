# Overview

```
Module Name:  Papyrus Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   alexander.holodov@papyrus.global
```

# Description

Connect to Papyrus system for bids.

Papyrus bid adapter supports Banner.

Please contact to info@papyrus.global for
further details

# Test Parameters
```
    var adUnits = [
    {
        code: 'test-div',
        mediaTypes: {
            banner: {
                sizes: [
                    [320, 50]
                ]
            }
        },
        bids: [
            {
                bidder: 'papyrus',
                params: {
                    address: '0xd7e2a771c5dcd5df7f789477356aecdaeee6c985',
                    placementId: 'b57e55fd18614b0591893e9fff41fbea'
                }
            }
        ]
    }
    ];
```
