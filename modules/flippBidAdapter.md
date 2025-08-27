# Overview

```
Module Name: Flipp Bid Adapter
Module Type: Bidder Adapter
Maintainer: prebid@flipp.com
```

# Description

This module connects publishers to Flipp's Shopper Experience via Prebid.js.


# Test parameters

```javascript
var adUnits = [
    {
        code: 'flipp-scroll-ad-content',
        mediaTypes: {
            banner: {
                sizes: [
                    [300, 600]
                ]
            }
        },
        bids: [
            {
                bidder: 'flipp',
                params: {
                    creativeType: 'NativeX', // Optional, can be one of 'NativeX' (default) or 'DTX' 
                    publisherNameIdentifier: 'wishabi-test-publisher', // Required
                    siteId: 1192075, // Required
                    zoneIds: [260678], // Optional
                    userKey: ``, // Optional, but recommended for better user experience. Can be a cookie, session id or any other user identifier
                    options: {
                        startCompact: true, // Optional. Height of the experience will be reduced. Default to true
                        dwellExpand: true // Optional. Auto expand the experience after a certain time passes. Default to true
                    }
                }
            }
        ]
    }
]
```
