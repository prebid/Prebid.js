# Overview

Module Name: rxrtb Bidder Adapter

Module Type: Bidder Adapter

Maintainer: contact@picellaltd.com


# Description

Module that connects to rxrtb's demand source

# Test Parameters
```javascript
    var adUnits = [
        {
            code: 'test-ad',
            sizes: [[728, 98]],
            bids: [
                {
                    bidder: 'rxrtb',
                    params: {
                        id: 89,
                        token: '658f11a5efbbce2f9be3f1f146fcbc22',
                        source: 'prebidtest'
                    }
                }
            ]
        },
    ];
```