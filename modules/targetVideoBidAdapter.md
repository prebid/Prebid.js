# Overview

```
Module Name:  Target Video Bid Adapter
Module Type:  Bidder Adapter
Maintainers:   grajzer@gmail.com, danijel.ristic@target-video.com
```

# Description

Connects to Appnexus exchange for bids.

TargetVideo bid adapter supports Banner and Video.

# Test Parameters
```js
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
  },
  // Video adUnit
  {
    mediaTypes: {
        video: {
            playerSize: [[640, 360]],
            context: 'instream',
            playbackmethod: [1, 2, 3, 4]
        }
    },
    bids: [{
        bidder: 'targetVideo',
        params: {
            placementId: 12345,
            reserve: 0,
        }
    }]
  }
];
```
