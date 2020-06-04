# Overview

```
Module Name:  YieldLift Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   info@yieldlift.com
```

# Description

Module that connects to YieldLift's demand sources

# Test Parameters
```
var adUnits = [
    {
        code: 'banner-ad-div',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [300,600]]
            }
        },
        bids: [{
            bidder: 'yieldlift',
            params: {
                unitId: 'test'
            }
        }]
    }
];
```
