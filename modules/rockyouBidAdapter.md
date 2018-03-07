# Overview

```
Module Name: RockYou Bidder Adapter  
Module Type: Bidder Adapter  
Maintainer: prebid.adapter@rockyou.com  
```

# Description

Connects to the RockYou exchange for bids.

The RockYou bid adapter supports Banner and Video.

For publishers who wish to be set up on the RockYou Ad Network, please contact
publishers@rockyou.com.

RockYou user syncing requires the `userSync.iframeEnabled` property be set to `true`.

# Test PARAMETERS
```
var adUnits = [

  // Banner adUnit
  {
    code: 'banner-div',
    mediaTypes: {
      banner: {
        sizes: [[720, 480]]
      }
    },

    bids: [{
          bidder: 'rockyou',
          params: {
            placementId: '4954'
          }
        }]
  },

  // Video (outstream)
  {
    code: 'video-outstream',
    mediaTypes: {
      video: {
        context: 'outstream',
        playerSize: [720, 480]
      }
    },
    bids: [{
      bidder: 'rockyou',
      params: {
        placementId: '4957'
      }
    }]
  }
]
```
