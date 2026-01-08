# Overview

```
Module Name: Driftpixel Bidder Adapter
Module Type: Driftpixel Bidder Adapter
Maintainer: developer@driftpixel.ai
```

# Description

Module that connects to driftpixel.com demand sources

# Test Parameters
```
var adUnits = [
    {
        code: 'test-banner',
        mediaTypes: {
            banner: {
                sizes: [[300, 250]],
            }
        },
        bids: [
            {
                bidder: 'driftpixel',
                params: {
                    env: 'driftpixel',
                    pid: '40',
                    ext: {}
                }
            }
        ]
    },
    {
        code: 'test-video',
        sizes: [ [ 640, 480 ] ],
        mediaTypes: {
            video: {
                playerSize: [640, 480],
                context: 'instream',
                skipppable: true
            }
        },
        bids: [{
            bidder: 'driftpixel',
            params: {
                env: 'driftpixel',
                pid: '40',
                ext: {}
            }
        }]
    }
];
```
