# Overview

Module Name: InSkin Bid Adapter

Module Type: Bid Adapter

Maintainer: 

# Description

Connects to InSkin Media for receiving bids from configured demand sources.

# Test Parameters
```javascript
    var adUnits = [
        {
            code: 'test-ad-1',
            sizes: [[300, 250]],
            bids: [
                {
                    bidder: 'inskin',
                    params: {
                        networkId: '9874',
                        siteId: '983808'
                    }
                }
            ]
        }
    ];
```
