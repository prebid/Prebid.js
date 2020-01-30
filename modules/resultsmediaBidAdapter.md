# Overview

```
Module Name: ResultsMedia (resultsmedia.com) Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@resultsmedia.COM
```

# Description

Prebid adapter for ResultsMedia RTB. Requires approval and account setup.

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
            bidder: 'resultsmedia',
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
            bidder: 'resultsmedia',
            params: {
                zoneId: 9999
            }
        }]
    }];
```