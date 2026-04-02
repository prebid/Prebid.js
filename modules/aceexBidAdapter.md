# Overview

```
Module Name: Aceex Bidder Adapter
Module Type: Bidder Adapter
Maintainer: tech@aceex.io
```

# Description

Module that connects Prebid.JS publishers to Aceex ad-exchange

# Parameters

| Name          | Scope    | Description               | Example              |
| :------------ | :------- | :------------------------ | :------------------- |
| `publisherId` | required | Publisher ID on platform | 219 |
| `trafficType` | required | Configures the mediaType that should be used. Values can be banner, native or video | "banner" |
| `internalKey` | required | Publisher hash on platform | "j1opp02hsma8119" |
| `bidfloor` | required | Bidfloor | 0.1 |

# Test Parameters
```
    var adUnits = [
                // Will return static test banner
                {
                    code: 'placementId_0',
                    mediaTypes: {
                        banner: {
                            sizes: [[300, 250]],
                        }
                    },
                    bids: [
                        {
                            bidder: 'aceex',
                            params: {
                                publisherId: 219,
                                internalKey: 'j1opp02hsma8119',
                                trafficType: 'banner',
                                bidfloor: 0.2
                            }
                        }
                    ]
                },
                // Will return test vast video
                {
                    code: 'placementId_0',
                    mediaTypes: {
                        video: {
                            playerSize: [640, 480],
                            context: 'instream'
                        }
                    },
                    bids: [
                        {
                            bidder: 'aceex',
                            params: {
                                publisherId: 219,
                                internalKey: 'j1opp02hsma8119',
                                trafficType: 'video',
                                bidfloor: 1.1
                            }
                        }
                    ]
                }
            ];
```
