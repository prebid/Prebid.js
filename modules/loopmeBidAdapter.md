# Overview

```
Module Name:  LoopMe Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   support@loopme.com
```

# Description

Connect to LoopMe's exchange for bids.

# Test Parameters
```
var adUnits = [{
    code: 'test-div',
    mediaTypes: {
        banner: {
            sizes: [[300, 250], [300,600]],
        }
    },
    bids: [{
        bidder: 'loopme',
        params: {
            ak: 'cc885e3acc'
        }
    }]
}];
```
