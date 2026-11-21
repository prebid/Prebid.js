# Overview

```
Module Name: xe Bidder Adapter
Module Type: xe Bidder Adapter
Maintainer: dima@xe.works
```

# Description

Module that connects to xe.works demand sources

# Bid Params

| Name  | Scope    | Description                 | Type     |
|-------|----------|-----------------------------|----------|
| `pid` | required | Unique placement ID         | `string` |
| `env` | required | Environment name            | `string` |
| `ext` | optional | Specific integration config | `object` |

The adapter also answers to the bidder codes `xeworks` and `lunamediax`.

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
                    pid: 'test-banner',
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
                pid: 'test-video',
                ext: {}
            }
        }]
    }
];
```