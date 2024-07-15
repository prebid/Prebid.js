# Overview

```
Module Name:  Opsco Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   prebid@ops.co
```

# Description

Module that connects to Opscos's demand sources.

# Test Parameters

## Banner

```
var adUnits = [
    {
        code: 'test-ad',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [300,600]]
            }
        },
        bids: [{
            bidder: 'opsco',
            params: {
                placementId: '1234',
                publisherId: '9876',
                test: true
            }
        }],
    }
];
```
