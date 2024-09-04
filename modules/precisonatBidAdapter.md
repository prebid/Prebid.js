# Overview

```
Module Name: Precisonat Bidder Adapter
Module Type: Bidder Adapter
Maintainer: tech@preciso.net
```

# Description

Module that connects to preciso' demand sources
please reach out to tech@preciso.net to receive your own publisher id

# Parameters

| Name          | Scope    | Description               | Example              |
| :------------ | :------- | :------------------------ | :------------------- |
| `publisherId` | required (for prebid.js) | partner ID provided by preciso | PreTest_0001
| `region`   | required (for prebid.js)     | 3 letter country code | "USA" |
| `bidFloor` | optional,recommended (for prebid.js)  | Minimum bid for this impression expressed in CPM (USD) | 0.01 |
| `traffic`  | required (for prebid.js)  | Configures the mediaType that should be used| "native" |
| `currency` | optional (for prebid.js)  | supported currencies  | ['USD'] |

# Test Parameters
```
    var adUnits = [
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
                            bidder: 'precisonat',
                            params: {
                                publisherId: 'PRECISO_TEST00001',
                                traffic: 'native',
                                bidFloor: 0.12,
                                currency: ['USD'],
                                region: 'USA'
                            }
                        }
                    ]
                },
            ]; 
```