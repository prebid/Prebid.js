# Overview

```
Module Name:  Target Video Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   grajzer@gmail.com
```

# Description

Connects to Appnexus exchange for bids.

TargetVideo bid adapter supports Banner.

# Test Parameters
```
var adUnits = [
  // Banner adUnit
  {
      code: 'banner-div',
      mediaTypes: {
          banner: {
              sizes: [[640, 480], [300, 250]],
          }
      },
      bids: [{
          bidder: 'targetVideo',
          params: {
              placementId: 13232361
          }
      }]
  }
];
```
