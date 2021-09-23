# Overview

```
Module Name: Advenue SSP Bidder Adapter
Module Type: Bidder Adapter
Maintainer: dev.advenue@gmail.com
```

# Description

Module that connects to Advenue SSP demand sources

# Test Parameters
```
    var adUnits = [{
                code: 'placementCode',
                sizes: [[300, 250]],
                bids: [{
                        bidder: 'advenue',
                        params: {
                            placementId: 0,
                            traffic: 'banner'
                        }
                    }]
                }
            ];
```
