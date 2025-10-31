# Overview

```
Module Name: StackAdapt Bidder Adapter
Module Type: Bidder Adapter
Maintainer: pjs@stackadapt.com
```

# Description

```
Module is the StackAdapt adapter for Prebid.
- Supports `banner` and `video` formats
- Uses `OpenRTB` standard
```

### Bid Params

| Name          | Scope    | Description                 | Example            | Type     |
|---------------|----------|-----------------------------|--------------------|----------|
| `publisherId` | required | StackAdapt provided id      | `'15'`             | `string` |
| `placementId` | optional | StackAdapt provided id      | `'2'`              | `string` |
| `banner`      | optional | banner supporting expdir    | `{expdir: [1, 3]}` | `object` |
| `bidfloor`    | optional | bid floor price             | `1.01`             | `float`  |

# Test Parameters
```js
var adUnits = [
    // Banner adUnit
    {
        code: 'div-test-ad-1',
        mediaTypes: {
            banner: {
                sizes: [[300, 250]],
            }
        },
        bids: [{
            bidder: 'stackadapt',
            params: {
                publisherId: '123',
                testMode: 1
            }
        }]
    },
    // Video adUnit
    {
        code: 'div-test-ad-2',
        mediaTypes: {
            video: {
                context: 'instream',
                playerSize: [640, 360],
                mimes: ['video/mp4'],
                protocols: [2, 3, 5, 6],
                maxduration: 60,
                api: [1, 2],
                playback_method: ['auto_play_sound_off'],
                plcmt: 1
            }
        },
        bids: [{
            bidder: 'stackadapt',
            params: {
                publisherId: '123',
                testMode: 1
            }
        }]
    }
];
```
