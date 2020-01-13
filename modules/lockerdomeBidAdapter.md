# Overview

```
Module Name: LockerDome Bidder Adapter
Module Type: Bidder Adapter
Maintainer: bidding@lockerdome.com
```

#Description
Connects to LockerDome Ad Server for bids.

# Test Parameters
```
var adUnits = [{
    code: 'ad-div',
    sizes: [[300, 250]],
    mediaTypes: {
        banner: {
            sizes: [[300, 250]]
        }
    },
    bids: [{
        bidder: 'lockerdome',
        params: {
            adUnitId: 'LD10809467961050726'
        }
    }]
}];
```
