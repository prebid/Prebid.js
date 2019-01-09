# Overview

```
Module Name: Safereach SSP Bidder Adapter
Module Type: Bidder Adapter
Maintainer: safereachprebid@ukr.net
```

# Description

Module that connects to Safereach SSP demand sources

# Test Parameters
```
    var adUnits = [{
                code: 'placementCode',
                sizes: [[300, 250]],
                bids: [{
                        bidder: 'safereach',
                        params: {
                            placementId: 0,
                            traffic: 'banner'
                        }
                    }]
                }
            ];
```
