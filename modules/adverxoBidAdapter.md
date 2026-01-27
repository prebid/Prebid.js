# Overview

```
Module Name: Adverxo Bidder Adapter
Module Type: Bidder Adapter
Maintainer: developer@adverxo.com
```

# Description

Module that connects to Adverxo to fetch bids.
Banner, native and video formats are supported.

# Bid Parameters

| Name       | Required? | Description                                                       | Example                                      | Type      |
|------------|-----------|-------------------------------------------------------------------|----------------------------------------------|-----------|
| `host`     | No        | Ad network host.                                                  | `prebidTest.adverxo.com`                     | `String`  |
| `adUnitId` | Yes       | Unique identifier for the ad unit in Adverxo platform.            | `413`                                        | `Integer` |
| `auth`     | Yes       | Authentication token provided by Adverxo platform for the AdUnit. | `'61336d75e414c77c367ce5c47c2599ce80a8x32b'` | `String`  |

# Test Parameters

```javascript
var adUnits = [
    {
        code: 'banner-ad-div',
        mediaTypes: {
            banner: {
                sizes: [
                    [400, 300],
                    [320, 50]
                ]
            }
        },
        bids: [{
            bidder: 'adverxo',
            params: {
                host: 'example.com',
                adUnitId: 1,
                auth: '61336e753414c77c367deac47c2595ce80a8032b'
            }
        }]
    },
    {
        code: 'native-ad-div',
        mediaTypes: {
            native: {
                image: {
                    required: true,
                    sizes: [400, 300]
                },
                title: {
                    required: true,
                    len: 75
                },
                body: {
                    required: false,
                    len: 200
                },
                cta: {
                    required: false,
                    len: 75
                },
                sponsoredBy: {
                    required: false
                }
            }
        },
        bids: [{
            bidder: 'adverxo',
            params: {
                host: 'example.com',
                adUnitId: 2,
                auth: '9a640dfccc3381e71fxc29ffd4a72wabd29g9d86'
            }
        }]
    },
    {
        code: 'video-div',
        mediaTypes: {
            video: {
                playerSize: [640, 480],
                context: 'outstream',
                mimes: ['video/mp4'],
                maxduration: 30,
                skip: 1
            }
        },
        bids: [{
            bidder: 'adverxo',
            params: {
                host: 'example.com',
                adUnitId: 3,
                auth: '1ax23d9621f21da28a2eab6f79bd5fbcf4d037c1'
            }
        }]
    }
];

```
