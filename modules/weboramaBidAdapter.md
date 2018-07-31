# Overview

```
Module Name: Weborama SSP Bidder Adapter
Module Type: Bidder Adapter
Maintainer: devweborama@gmail.com
```

# Description

Module that connects to Weborama SSP demand sources

# Test Parameters
```
    var adUnits = [{
                code: 'placementCode',
                sizes: [[300, 250]],
                bids: [{
                        bidder: 'weborama',
                        params: {
                            placementId: 0,
                            traffic: 'banner'
                        }
                    }]
                }
            ];
```
