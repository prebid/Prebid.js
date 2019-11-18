# Overview

```
Module Name: BizzClick SSP Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@bizzclick.com
```

# Description

Module that connects to BizzClick SSP demand sources

# Test Parameters
```
    var adUnits = [{
                code: 'placementId',
                sizes: [[300, 250]],
                bids: [{
                        bidder: 'bizzclick',
                        params: {
                            placementId: 0,
                            type: 'banner'
                        }
                    }]
                }
            ];
```