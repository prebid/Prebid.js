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
    sizes: [[720, 480]],

    // Replace this object to test a new Adapter!
    bids: [{
          bidder: 'rockyou',
          params: {
            placementId: '4322'
          }
        }]
  },

  // Video (outstream)
  {
    code: 'video-outstream',
    sizes: [[720, 480]],

    mediaType: 'video',
    mediaTypes: {
      video: {
        context: 'outstream'
      }
    },
    bids: [{
      bidder: 'rockyou',
      params: {
        placementId: '4307'
      }
    }]
  }
]
```
