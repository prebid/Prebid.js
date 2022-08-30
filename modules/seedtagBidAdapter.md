# Overview

```
Module Name: Seedtag Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@seedtag.com
```

# Description

Prebidjs seedtag bidder

# Sample integration

All display/video integration use the placement `banner`.


```js
const adUnits = [
  {
    code: '/21804003197/prebid_test_300x250',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [1, 1]]
      }
    },
    bids: [
      {
        bidder: 'seedtag',
        params: {
          publisherId: '0000-0000-01',      // required
          adUnitId: '0000',                 // required
          placement: 'banner',              // required, banner only
          adPosition: 0                     // optional
        }
      }
    ]
  }
]
```
