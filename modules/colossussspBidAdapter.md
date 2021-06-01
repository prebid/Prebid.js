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
                mediaTypes: {
                    banner: {
                        sizes: [[300, 250], [300,600]]
                    }
                },
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
