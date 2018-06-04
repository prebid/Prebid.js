# Overview

Module Name: Consumable Bid Adapter

Module Type: Consumable Adapter

Maintainer: naffis@consumable.com

# Description

Module that connects to Consumable's demand sources

# Test Parameters
```javascript
    var adUnits = [
        {
            code: 'test-ad-div',
            sizes: [[300, 250]],
            bids: [
                {
                    bidder: 'consumable',
                    params: {
                        placement: '1234567',
                        unitId: '1234',
                        unitName: 'cnsmbl-300x250',
                        zoneId: '13136.52'
                    }
                }
            ]
        }
    ];
```
