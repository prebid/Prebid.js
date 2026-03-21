# Overview

```
Module Name: Adipolo Bidder Adapter
Module Type: Adipolo Bidder Adapter
Maintainer: support@adipolo.com
```

# Description

Module that connects to adipolo.com demand sources

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
                bidder: 'adipolo',
                params: {
                    env: 'adipolo',
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
            bidder: 'adipolo',
            params: {
                env: 'adipolo',
                pid: '40',
                ext: {}
            }
        }]
    }
];
```
