# Overview

```
Module Name: RobustApps Bidder Adapter
Module Type: RobustApps Bidder Adapter
Maintainer: prebid@robust-apps.com
```

# Description

Module that connects to rbstsystems.live demand sources

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
                bidder: 'robustApps',
                params: {
                    env: 'robustApps',
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
            bidder: 'robustApps',
            params: {
                env: 'robustApps',
                pid: 'aa8217e20131c095fe9dba67981040b0',
                ext: {}
            }
        }]
    }
];
```
