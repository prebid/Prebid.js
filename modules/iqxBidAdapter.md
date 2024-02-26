# Overview

```
Module Name: IQX Bidder Adapter
Module Type: IQX Bidder Adapter
Maintainer: it@iqzone.com
```

# Description

Module that connects to iqx.com demand sources

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
                bidder: 'iqx',
                params: {
                    env: 'iqx',
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
            bidder: 'iqx',
            params: {
                env: 'iqx',
                pid: '40',
                ext: {}
            }
        }]
    }
];
```
