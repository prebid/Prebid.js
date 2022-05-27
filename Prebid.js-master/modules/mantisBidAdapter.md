# Overview

Module Name: MANTIS Ad Network Bid Adapter

Module Type: Bidder Adapter

Maintainer: paris@mantisadnetwork.com

# Description

Module that connects to MANTIS's demand sources

# Test Parameters
```javascript
    var adUnits = [
        {
            code: 'test',
            sizes: [[300, 250]],
            bids: [
                {
                    bidder: 'mantis',
                    params: {
                        property: 'demo',
                        zone: 'zone'
                    }
                }
            ]
        }
    ];
```
