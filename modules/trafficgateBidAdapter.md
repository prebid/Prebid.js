# Overview

```
Module Name: TrafficGate Bidder Adapter
Module Type: Bidder Adapter
Maintainer: publishers@bidscube.com
```

# Description

Module that connects to TrafficGate demand sources
TrafficGate is operated by BidsCube and uses the BidsCube IAB GVL vendor ID (1272).

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
            bidder: 'trafficgate',
            params: {
                placementId: 0,
                host: 'example'
            }
        }]
    }];
```
