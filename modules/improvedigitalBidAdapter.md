# Overview

```text
Module Name: Improve Digital Bidder Adapter
Module Type: Bidder Adapter
Maintainer: hb@azerion.com
```

# Description

This module connects publishers to Improve Digital's demand sources through Prebid.js.

# Test Parameters

```javascript
const adUnits = [{
    code: 'banner-ad-unit',
    mediaTypes: {
        banner: {
            sizes: [[300, 250]],
        }
    },
    bids: [
        {
            bidder: 'improvedigital',
            params: {
                publisherId: 950,
                placementId: 22135702,
            }
        }
    ]
}, {
    code: 'video-ad-unit',
     mediaTypes: {
        video: {
            playerSize: [640, 480],
            context: 'instream',
            plcmt: 2,
        }
    },
    bids: [{
        bidder: 'improvedigital',
        params: {
            publisherId: 950,
            placementId: 22137694,
            keyValues: {
                testKey: ["testValue"],
            },
        },
    }],
}];
```
