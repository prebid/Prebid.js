# Overview

```
Module Name:  InsurAds Bid Adapter
Module Type:  Bidder Adapter
Maintainer: jclimaco@insurads.com
```

# Description

Connects to InsurAds network for bids.

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
         bidder: 'insurads',
         params: {
            tagId: 'ToBeSupplied'
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
            bidder: 'insurads',
            params: {
              tagId: 'ToBeSupplied'
            }
        }]
    };
```
