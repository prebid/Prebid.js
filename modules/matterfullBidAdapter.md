# Overview

```
Module Name: Matterfull Bidder Adapter
Module Type: Matterfull Bidder Adapter
Maintainer: adops@bematterfull.com
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
                bidder: 'matterfull',
                params: {
                    env: 'matterfull',
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
            bidder: 'matterfull',
            params: {
                env: 'matterfull',
                pid: 'aa8217e20131c095fe9dba67981040b0',
                ext: {}
            }
        }]
    }
];
```
