# Overview

```
Module Name:  Waardex Bid Adapter
Module Type:  Bidder Adapter
Maintainer: 
```

# Description

Connects to Waardex exchange for bids.

Waardex bid adapter supports Banner and Video.

# Test Parameters
## Banner
```javascript
var sizes = [
    [300, 250]
];
var PREBID_TIMEOUT = 5000;
var FAILSAFE_TIMEOUT = 5000;

var adUnits = [
    {
        code: '/19968336/header-bid-tag-0',
        mediaTypes: {
            banner: {
                sizes: sizes
            }
        },
        bids: [
            {
                bidder: 'waardex',
                params: {
                    position: 1,
                    instl: 1,
                    zoneId: 1
                }
            }
        ]
    }
];
```

## Video

```javascript
const PREBID_TIMEOUT = 1000;
const FAILSAFE_TIMEOUT = 3000;

const sizes = [
    [640, 480]
];

const adUnits = [
    {
        code: 'video1',
        mediaTypes: {
            video: {
                context: 'instream',
                playerSize: sizes[0],
                mimes: ['video/x-ms-wmv', 'video/mp4'],
                minduration: 2,
                maxduration: 10,
                protocols: ['VAST 1.0', 'VAST 2.0'],
                startdelay: -1,
                placement: 1,
                skip: 1,
                skipafter: 2,
                minbitrate: 0,
                maxbitrate: 0,
                delivery: [1, 2, 3],
                playbackmethod: [1, 2],
                api: [1, 2, 3, 4, 5, 6],
                linearity: 1,
                position: 1
            }
        },
        bids: [
            {
                bidder: 'waardex',
                params: {
                    instl: 1,
                    zoneId: 1
                }
            }
        ]
    }
]
```
