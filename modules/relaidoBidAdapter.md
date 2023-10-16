# Overview

```
Module Name: Relaido Bidder Adapter
Module Type: Bidder Adapter
Maintainer: video-dev@cg.relaido.co.jp
```

# Description

Connects to Relaido exchange for bids.

Relaido bid adapter supports Outstream Video.

# Test Parameters

```javascript
    var adUnits=[{
        code: 'banner-ad-div',
        mediaTypes: {
            banner: {
                sizes: [
                    [300, 250]
                ]
            }
        },
        bids: [{
            bidder: 'relaido',
            params: {
                placementId: '9900'
            }
        }]
    },{
        code: 'video-ad-player',
        mediaTypes: {
            video: {
                context: 'outstream',
                playerSize: [640, 360]
            }
        },
        bids: [{
            bidder: 'relaido',
            params: {
                placementId: '9900'
            }
        }]
    }];
```