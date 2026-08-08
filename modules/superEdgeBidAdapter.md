# Overview

```
Module Name: superEdge Bidder Adapter
Module Type: Bidder Adapter
Maintainer: op@superedge.co.jp
```

# Description

Module that connects to superEdge's demand sources.

This adapter supports `banner` and `native` media types. Please contact us to obtain the `sk` (secret key) parameter.

# Test Parameters

```javascript
    var adUnits = [
        // Banner
        {
            code: 'test-banner',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250], [320, 50]],
                }
            },
            bids: [
                {
                    bidder: 'superEdge',
                    params: {
                        sk: '',         // required, secret key provided by superEdge
                        publisher: '',  // optional, publisher identifier
                        test: 1         // optional, set to 1 for test mode
                    }
                }
            ]
        },
        // Native
        {
            code: 'test-native',
            mediaTypes: {
                native: {
                    title: {
                        required: true
                    },
                    image: {
                        required: true,
                        sizes: [300, 250]
                    }
                }
            },
            bids: [
                {
                    bidder: 'superEdge',
                    params: {
                        sk: '',         // required
                        publisher: '',  // optional
                        test: 1         // optional
                    }
                }
            ]
        }
    ];
```

### Params

| Key | Required | Type | Description |
| --- | -------- | ---- | ----------- |
| `sk` | yes | String | Secret key provided by superEdge |
| `publisher` | no | String | Publisher identifier |
| `test` | no | Integer | Set to `1` for test requests |
| `placementId` | no | String | Placement ID (fallback for `ortb2Imp.ext.gpid`) |
| `tagid` | no | String | Ad tag identifier |
