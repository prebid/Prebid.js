# Overview

```
Module Name: GumGum Bidder Adapter
Module Type: Bidder Adapter
Maintainer: engineering@gumgum.com
```

# Description

GumGum adapter for Prebid.js 1.0

# Test Parameters
```
var adUnits = [
  {
    code: 'test-div',
    sizes: [[300, 250]],
    bids: [
      {
        bidder: 'gumgum',
        params: {
          inSlot: '9' // GumGum Slot ID given to the client
        }
      }
    ]
  },{
    code: 'test-div',
    sizes: [[300, 50]],
    bids: [
      {
        bidder: 'gumgum',
        params: {
          inScreen: 'ggumtest' // GumGum Zone ID given to the client
        }
      }
    ]
  }
];
```
