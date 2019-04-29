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
          inSlot: '15901', // GumGum Slot ID given to the client,
          bidfloor: 0.03 // CPM bid floor
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
          inScreen: 'dc9d6be1', // GumGum Zone ID given to the client
          bidfloor: 0.03 // CPM bid floor
        }
      }
    ]
  }
];
```
