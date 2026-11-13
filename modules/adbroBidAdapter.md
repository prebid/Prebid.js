# Overview

```
Module Name:  ADBRO Bid Adapter
Module Type:  Bidder Adapter
Maintainer: devops@adbro.me
```

# Description

Module that connects to ADBRO as a demand source.
Only Banner format is currently supported.

# Test Parameters
```javascript
var adUnits = [
{
    code: 'test-div',
    sizes: [
        [300, 250],
    ],
    bids: [{
        bidder: 'adbro',
        params: {
            placementId: '1234'
        }
    }]
}];
```
