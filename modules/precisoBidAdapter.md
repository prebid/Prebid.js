# Overview

```
Module Name: Preciso Bidder Adapter
Module Type: Bidder Adapter
Maintainer: tech@preciso.net
```

# Description

Module that connects to preciso' demand sources

# Parameters

| Name          | Scope    | Description               | Example              |
| :------------ | :------- | :------------------------ | :------------------- |
| `region`      | optional (for prebid.js)     | 3 letter country code | "USA"  |
| `publisherId` | required (for prebid-server) |  partner ID provided by preciso | PreTest_0001 |
| `traffic`     | optional (for prebid.js)     | Configures the mediaType that should be used. Values can be banner, native | "banner" |

# Test Parameters
```
    var adUnits = [
                // Will return static native ad. Assets are stored through user UI for each placement separetly
                {
                    code: 'placementId_0',
                    mediaTypes: {
                        native: {
                            ortb: {
                                assets: [
                                   {
                                        id: 3,
                                        required: 1,
                                        img: {
                                            type: 3,
                                            w: 300,
                                            h: 250
                                        }
                                    },
                                {
                                    id: 1,
                                    required: 1,
                                    title: {
                                        len: 800
                                    }
                                },
                                {
                                    id: 4,
                                    required: 0,
                                    data: {
                                        type: 1
                                    }
                                }
                            ]
                        }
                        }
                    },
                    bids: [
                        {
                            bidder: 'preciso',
                            params: {
                                host: 'prebid',
                                publisherId: '0',
                                region: 'USA',
                                traffic: 'native'
                            }
                        }
                    ]
                },
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
                            bidder: 'preciso',
                            params: {
                                host: 'prebid',
                                publisherId: '0',
                                region: 'USA',
                                traffic: 'banner'
                            }
                        }
                    ]
                }
            ]; 
```