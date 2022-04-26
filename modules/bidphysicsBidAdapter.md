# Overview

```
Module Name:  BidPhysics Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   info@bidphysics.com
```

# Description

Connects to BidPhysics exchange for bids.

BidPhysics bid adapter supports Banner ads.

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
            bidder: 'bidphysics',
            params: {
                unitId: 'bidphysics-test'
            }
        }]
    }
];
```
