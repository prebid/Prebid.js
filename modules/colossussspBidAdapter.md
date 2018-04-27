# Overview

```
Module Name: Colossus SSP Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@colossusmediallc.com
```

# Description

Module that connects to Colossus SSP demand sources

# Test Parameters
```
    var adUnits = [{
                code: 'placementid_0',
                sizes: [[300, 250]],
                bids: [{
                        bidder: 'colossusssp',
                        params: {
                            placement_id: 0,
                            traffic: 'banner'
                        }
                    }]
                }
            ];
```
