# Overview

```
Module Name: Revealon Bidder Adapter
Module Type: Revealon Bidder Adapter
Maintainer: prebid@revealon-apps.com
```

# Description

Module that connects to revealon.live demand sources

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
                bidder: 'revealon',
                params: {
                    env: 'revealon',
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
            bidder: 'revealon',
            params: {
                env: 'revealon',
                pid: 'aa8217e20131c095fe9dba67981040b0',
                ext: {}
            }
        }]
    }
];
```
