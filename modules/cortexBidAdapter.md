# Overview

```
Module Name: Cortex Bidder Adapter
Module Type: Cortex Bidder Adapter
Maintainer: dev@cortextech.it
```

# Description

Connects to Cortex exchange for bids.
Cortex bid adapter supports Banner, Video (instream and outstream) and Native.

# Bid Params

| Name | Scope | Description | Example | Type |
|---|---|---|---|---|
| placementId | optional* | Placement ID from the Cortex platform. Required when `endpointId` is not set. | `'testBanner'` | `string` |
| endpointId | optional* | Endpoint ID from the Cortex platform. Required when `placementId` is not set. | `'testEndpoint'` | `string` |

\* At least one of `placementId` or `endpointId` must be provided.

# Test Parameters
```
    var adUnits = [
                // Will return static test banner
                {
                    code: 'adunit1',
                    mediaTypes: {
                        banner: {
                            sizes: [ [300, 250], [320, 50] ],
                        }
                    },
                    bids: [
                        {
                            bidder: 'cortex',
                            params: {
                                placementId: 'testBanner',
                            }
                        }
                    ]
                },
                {
                    code: 'addunit2',
                    mediaTypes: {
                        video: {
                            playerSize: [ [640, 480] ],
                            context: 'instream',
                            minduration: 5,
                            maxduration: 60,
                        }
                    },
                    bids: [
                        {
                            bidder: 'cortex',
                            params: {
                                placementId: 'testVideo',
                            }
                        }
                    ]
                },
                {
                    code: 'addunit3',
                    mediaTypes: {
                        native: {
                            title: {
                                required: true
                            },
                            body: {
                                required: true
                            },
                            icon: {
                                required: true,
                                size: [64, 64]
                            }
                        }
                    },
                    bids: [
                        {
                            bidder: 'cortex',
                            params: {
                                placementId: 'testNative',
                            }
                        }
                    ]
                }
            ];
```
