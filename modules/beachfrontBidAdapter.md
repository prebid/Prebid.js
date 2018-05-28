# Overview

Module Name: Beachfront Bid Adapter

Module Type: Bidder Adapter

Maintainer: johnsalis@beachfront.com

# Description

Module that connects to Beachfront's demand sources

# Test Parameters
```javascript
    var adUnits = [
        {
            code: 'test-video',
            sizes: [[640, 360]],
            mediaTypes: {
                video: {
                    context: 'instream'
                }
            },
            bids: [
                {
                    bidder: 'beachfront',
                    params: {
                        bidfloor: 0.01,
                        appId: '11bc5dd5-7421-4dd8-c926-40fa653bec76'
                    }
                }
            ]
        }
    ];
```