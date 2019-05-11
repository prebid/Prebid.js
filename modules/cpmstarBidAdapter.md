# Overview

```
Module Name: Cpmstar Bidder Adapter
Module Type: Bidder Adapter
Maintainer: josh@cpmstar.com
```

# Description

Module that connects to Cpmstar's demand sources

# Test Parameters
```
var adUnits = [
  {
    code: 'banner-ad-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      }
    },
    bids: [{
      bidder: 'cpmstar',
      params: {
        placementId: 81006
      }
    }]
  }
];
```