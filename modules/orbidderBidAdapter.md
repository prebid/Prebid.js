#Overview

```
Module Name: Orbidder Bid Adapter
Module Type: Bidder Adapter
Maintainer: orbidder@otto.de
```

# Description

Module that connects to orbidder demand sources

# Test Parameters
```
var adUnits = [
    {
        code: 'test_banner',
        mediaTypes: {
            banner: {
                sizes: [728, 90]
            }
        },
        bids: [{
            bidder: 'orbidder',
            params: {
                accountId: "someAccount",
                placementId: "somePlace"
            }
        }],
    },
    {
        code: 'test_native',
        mediaTypes: {
            native: {
                title: {
                    required: true,
                    len: 80
                },
                image: {
                    required: true,
                    sizes: [150, 50]
                },
                sponsoredBy: {
                    required: true
                }
            },
        },
        bids: [{
            bidder: 'orbidder',
            params: {
                accountId: "someAccount",
                placementId: "somePlace"
            }
        }],
    }
];
```
