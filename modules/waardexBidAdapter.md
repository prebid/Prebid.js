# Overview

```
Module Name:  Waardex Bid Adapter
Module Type:  Bidder Adapter
Maintainer: info@prebid.org
```

# Description

Connects to Waardex exchange for bids.

Waardex bid adapter supports Banner.

# Test Parameters

```

var sizes = [
    [300, 250]
];
var PREBID_TIMEOUT = 5000;
var FAILSAFE_TIMEOUT = 5000;

var adUnits = [{
  code: '/19968336/header-bid-tag-0',
  mediaTypes: {
    banner: {
        sizes: sizes,
    },
  },
  bids: [{
    bidder: 'waardex',
    params: {
        placementId: 13144370,
        position: 1,  // add position openrtb
        bidfloor: 0.5,
        instl: 0,     // 1 - full screen
        pubId: 1,
    }
  }]
},{
    code: '/19968336/header-bid-tag-1',
    mediaTypes: {
        banner: {
            sizes: sizes,
        },
    },
    bids: [{
        bidder: 'waardex',
        params: {
            placementId: 333333333333,
            position: 1,  // add position openrtb
            bidfloor: 0.5,
            instl: 0,     // 1 - full screen
            pubId: 1,
        }
    }]
}];
```
