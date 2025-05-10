# Overview

```
Module Name: BidsCube Bidder Adapter
Module Type: Bidder Adapter
Maintainer: publishers@bidscube.com
```

# Description

Module that connects to BidsCube' demand sources

# Test Parameters
```
    var adUnits = [{
        code: 'placementId_0',
        mediaTypes: {
            banner: {
                sizes: [[300, 250]]
            }
        },
        bids: [{
            bidder: 'bidscube',
            params: {
                placementId: 0,
                traffic: 'banner'
            }
        }]
    }];
```
