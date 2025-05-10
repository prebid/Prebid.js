# Overview

```
Module Name: xe Bidder Adapter
Module Type: xe Bidder Adapter
Maintainer: dima@xe.works
```

# Description

Module that connects to xe.works demand sources

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
                bidder: 'xe',
                params: {
                    env: 'xe',
                    placement: 'test-banner',
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
            bidder: 'xe',
            params: {
                env: 'xe',
                placement: 'test-video',
                ext: {}
            }
        }]
    }
];
```