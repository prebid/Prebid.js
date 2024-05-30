# Overview

```
Module Name:  Nexx360 Bid Adapter
Module Type:  Bidder Adapter
Maintainer: gabriel@nexx360.io
```

# Description

Connects to Nexx360 network for bids.

To use us as a bidder you must have an account and an active "tagId" on our Nexx360 platform.

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
         bidder: 'nexx360',
         params: {
            account: '1067',
            tagId: 'luvxjvgn'
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
            bidder: 'nexx360',
            params: {
               account: '1067',
               tagId: 'luvxjvgn'
            }
        }]
    };
```
