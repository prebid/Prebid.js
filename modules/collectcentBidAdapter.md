# Overview

```
Module Name: Collectcent SSP Bidder Adapter
Module Type: Bidder Adapter
Maintainer: dev.collectcent@gmail.com
```

# Description

Module that connects to Collectcent SSP demand sources

# Test Parameters
```
    var adUnits = [{
                code: 'placementCode',
                sizes: [[300, 250]],
                bids: [{
                        bidder: 'collectcent',
                        params: {
                            placementId: 0,
                            traffic: 'banner'
                        }
                    }]
                }
            ];
```
