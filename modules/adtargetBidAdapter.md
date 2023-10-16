# Overview

**Module Name**: Adtarget Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: kamil@adtarget.com.tr

# Description
Provides a solution for accessing Video demand and display demand from Adtarget

# Test Parameters
```
    var adUnits = [

      // Video adUnit
      {
        code: 'videoPlayer',
        mediaTypes: {
          video: {
            playerSize:[640,480]
            context: 'instream'
          }
        },
        bids: [{
          bidder: 'adtarget',
          params: {
            aid: 331133
          }
        }]
      },

      // Banner adUnit
      {
        code: 'bannerAd',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        bids: [{
          bidder: 'adtarget',
          params: {
            aid: 350975
          }
        }]
      }
    ];
```
