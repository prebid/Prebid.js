# Overview

Module Name: Consumable Bid Adapter

Module Type: Consumable Adapter

Maintainer: prebid@consumable.com

# Description

Module that connects to Consumable's demand sources

# Test Parameters
```javascript
    var adUnits = [
        {
            code: 'test-ad-1',
            sizes: [[300, 250]],
            bids: [
                {
                    bidder: 'consumable',
                    params: {
                        networkId: '9969',
                        siteId: '980639',
                        unitId: '123456',
                        unitName: 'cnsmbl-unit'
                    }
                }
            ]
        },
        {
            code: 'test-ad-2',
            sizes: [[300, 250]],
            bids: [
                {
                    bidder: 'consumable',
                    params: {
                        networkId: '9969',
                        siteId: '980639',
                        unitId: '123456',
                        unitName: 'cnsmbl-unit',
                        zoneIds: [178503]
                    }
                }
            ]
        }
    ];
```