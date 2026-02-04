# Overview

```
Module Name:  Revnew Bid Adapter
Module Type:  Bidder Adapter
Maintainer: gabriel@nexx360.io
```

# Description

Connects to Revnew network for bids.

To use us as a bidder you must have an account and an active "tagId" or "placement" on our platform.

# Test Parameters

## Web

### Display
```
var adUnits = [
   // Banner adUnit
   {
      code: 'banner-div',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300,600]]
        }
      },
      bids: [{
         bidder: 'revnew',
         params: {
            tagId: 'testnexx'
         }
       }]
   },
];
```

### Video Instream
```
    var videoAdUnit = {
        code: 'video1',
        mediaTypes: {
            video: {
                playerSize: [640, 480],
                context: 'instream'
            }
        },
        bids: [{
            bidder: 'revnew',
            params: {
              placement: 'TEST_PLACEMENT'
            }
        }]
    };
```
