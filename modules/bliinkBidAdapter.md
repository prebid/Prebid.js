# Overview

```
Module Name: BLIINK Bidder Adapter
Module Type: Bidder Adapter
Maintainer: samuel@bliink.io | jonathan@bliink.io
```

# Description

Module that connects to BLIINK demand sources to fetch bids.

# Test Parameters

## Sample Banner Ad Unit

```js
const adUnits = [
  {
    code: '/19968336/test',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [
      {
        bidder: 'bliink',
        params: {
          placement: 'banner',
          tagId: '14f30eca-85d2-11e8-9eed-0242ac120007'
        }
      }
    ]
  }
]
```
