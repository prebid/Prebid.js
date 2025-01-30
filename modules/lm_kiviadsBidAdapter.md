# Overview

```
Module Name: lm_kiviads Bidder Adapter
Module Type: lm_kiviads Bidder Adapter
Maintainer: pavlo@xe.works
```

# Description

Module that connects to kiviads.com demand sources

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
                bidder: 'lm_kiviads',
                params: {
                    env: 'lm_kiviads',
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
            bidder: 'lm_kiviads',
            params: {
                env: 'lm_kiviads',
                pid: '40',
                ext: {}
            }
        }]
    }
];
```
