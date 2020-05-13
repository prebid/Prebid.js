# Overview

```
Module Name: Mars Media Group (mars.media) Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@mars.media
```

# Description

Prebid adapter for Mars Media Group RTB. Requires approval and account setup.

# Test Parameters

## Web
```
    var adUnits = [{
        code: 'banner-ad-div',
        mediaTypes: {
            banner: {
                sizes: [
                    [300, 200] // banner sizes
                ],
            }
        },
        bids: [{
            bidder: 'marsmedia',
            params: {
                zoneId: 9999
            }
        }]
    }, {
        code: 'video-ad-player',
        mediaTypes: {
            video: {
                context: 'instream', // or 'outstream'
                playerSize: [640, 480] // video player size        	
            }
        },
        bids: [{
            bidder: 'marsmedia',
            params: {
                zoneId: 9999
            }
        }]
    }];
```