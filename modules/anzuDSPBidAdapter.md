# Overview

```
Module Name: AnzuDSP Bidder Adapter
Module Type: AnzuDSP Bidder Adapter
Maintainer: prebid@anzu.io
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
                bidder: 'anzuDSP',
                params: {
                    env: 'anzuDSP',
                    pid: 'aa8217e20131c095fe9dba67981040b0',
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
            bidder: 'anzuDSP',
            params: {
                env: 'anzuDSP',
                pid: 'aa8217e20131c095fe9dba67981040b0',
                ext: {}
            }
        }]
    }
];
```
