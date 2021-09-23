# Overview

```
Module Name:  Bid Glass Bid Adapter
Module Type:  Bidder Adapter
Maintainer: dliebner@gmail.com
```

# Description

Connects to Bid Glass and allows bids on ad units to compete within prebid.

# Sample Ad Unit: For Publishers
```
var adUnits = [{
    code: 'bg-test-rectangle',    
    sizes: [[300, 250]],     
    bids: [{
        bidder: 'bidglass',
        params: {
            adUnitId: '-1'
        }
    }]
},{
    code: 'bg-test-leaderboard',    
    sizes: [[728, 90]],     
    bids: [{
        bidder: 'bidglass',
        params: {
            adUnitId: '-1'
        }
    }]
}]
```