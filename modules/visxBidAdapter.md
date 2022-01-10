# Overview

```
Module Name:    YOC VIS.X Bidder Adapter
Module Type:    Bidder Adapter
Maintainer:     service@yoc.com
```

# Description

Module that connects to YOC VIS.X® demand source to fetch bids.

# Test Parameters
```javascript
var adUnits = [
    // YOC Mystery Ad adUnit
    {
        code: 'yma-test-div',
        mediaTypes: {
            banner: {
                sizes: [[1, 1]]
            }
        },
        bids: [
            {
                bidder: 'visx',
                params: {
                    uid: '903535'
                }
            }
        ]
    },
    // YOC Understitial Ad adUnit
    {
        code: 'yua-test-div',
        mediaTypes: {
            banner: {
                sizes: [[300, 250]]
            }
        },
        bids: [
            {
                bidder: 'visx',
                params: {
                    uid: '903536'
                }
            }
        ]
    },
    // YOC In-stream adUnit
    {
        code: 'instream-test-div',
        mediaTypes: {
            video: {
                context: 'instream',
                playerSize: [400, 300],
                mimes: ['video/mp4'],
                protocols: [3, 6]
            },
        },
        bids: [
            {
                bidder: 'visx',
                params: {
                    uid: '921068'
                }
            }
        ]
    }
];
```
