# Overview

```
Module Name: Digitalcaramel Bid Adapter
Module Type: Bidder Adapter
Maintainer: tech@digitalcaramel.com
```

# Description
Connects to Digitalcaramel server for bids.
Module supports banner and video mediaType.

# Test Parameters

```
    var adUnits = [{
        code: '/test/div',
        mediaTypes: {
            banner: {
                sizes: [[300, 250]]
            }
        },
        bids: [{
            bidder: 'digitalcaramel',
            params: {
                siteId: 'd1d83nbdi0fs73874a0g',
                placementId: 'd1d8493di0fs73874a10'
            }
        }]
    },
    {
        code: '/test/div',
        mediaTypes: {
            video: {
                playerSize: [[640, 360]]
            }
        },
        bids: [{
            bidder: 'digitalcaramel',
            params: {
                siteId: 'd1d83nbdi0fs73874a0g',
                placementId: 'd24v2ijdi0fs73874afg'
            }
        }]
    },];
```
