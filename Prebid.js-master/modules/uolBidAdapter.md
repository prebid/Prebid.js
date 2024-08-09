# Overview

```
Module Name:  UOL Project Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   l-prebid@uolinc.com
```

# Description

Connect to UOL Project's exchange for bids.

For proper setup, please contact UOL Project's team at l-prebid@uolinc.com

# Test Parameters
```
    var adUnits = [
        {
            code: '/19968336/header-bid-tag-0',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250],[300, 600]]
                }
            },
            bids: [{
                bidder: 'uol',
                params: {
                    placementId: 1231244,
                    test: true,
                    cpmFactor: 2
                }
            }
            ]
        },
        {
            code: '/19968336/header-bid-tag-1',
            mediaTypes: {
                banner: {
                    sizes: [[970, 250],[728, 90]]
                }
            },
            bids: [{
                bidder: 'uol',
                params: {
                    placementId: 1231242,
                    test: false
                }
            }]
        }
    ];
```
