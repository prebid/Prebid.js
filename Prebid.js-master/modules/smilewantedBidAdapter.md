# Overview

```
Module Name: SmileWanted Bidder Adapter
Module Type: Bidder Adapter
Maintainer: maxime@smilewanted.com
```

# Description

To use us as a bidder you must have an account and an active "zoneId" on our SmileWanted platform.

# Test Parameters

## Web

### Display
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "smilewanted",
                       params: {
                            zoneId: 1
                       }
                   }
               ]
           }
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
            bidder: 'smilewanted',
            params: {
                zoneId: 2,
            }
        }]
    };
```

### Video Outstream
```
    var videoAdUnit = {
        code: 'video1',
        mediaTypes: {
            video: {
                playerSize: [640, 480],
                context: 'outstream'
            }
        },
        bids: [{
            bidder: 'smilewanted',
            params: {
                zoneId: 3,
            }
        }]
    };
```