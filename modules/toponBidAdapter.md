# Overview

```
Module Name:  TopOn Bid Adapter
Module Type:  Bidder Adapter
Maintainer: support@toponad.net
```

# Description

TopOn Bid Adapter for Prebid.js

# Sample Banner Ad Unit: For Publishers

```
var adUnits = [{
    code: 'test-div',
    sizes: [
        [300, 250],
        [728, 90]
    ],
    bids: [{
      bidder: 'topon',
      params: {
        pubid: 'pub-uuid', // required, must be a string, not an integer or other js type.
      }
    }]
}];
```
