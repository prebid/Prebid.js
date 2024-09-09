# Overview

```
Module Name: Dichange Bidder Adapter
Module Type: Dichange Bidder Adapter
Maintainer: di-change@digitalmatter.ai
```

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
                bidder: 'dichange',
                params: {
                    env: 'dichange',
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
            bidder: 'dichange',
            params: {
                env: 'dichange',
                pid: '40',
                ext: {}
            }
        }]
    }
];
```
