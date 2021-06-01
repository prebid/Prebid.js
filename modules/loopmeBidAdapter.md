# Overview

```
Module Name:  LoopMe Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   support@loopme.com
```

# Description

Connect to LoopMe's exchange for bids.

# Test Parameters (Banner)
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

# Test Parameters (Video)
```
var adUnits = [{
    code: 'video1',
    mediaTypes: {
        video: {
            playerSize: [640, 480],
            context: 'outstream'
        }
    },
    bids: [{
        bidder: 'loopme',
        params: {
            ak: '223051e07f'
        }
    }]
}];
```
