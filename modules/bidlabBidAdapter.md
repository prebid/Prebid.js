# Overview

```
Module Name: bidlab Bidder Adapter
Module Type: bidlab Bidder Adapter
```

# Description

Module that connects to bidlab demand sources

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
                            bidder: 'bidlab',
                            params: {
                                placementId: 0,
                                traffic: 'banner'
                            }
                        }
                    ]
                },
                // Will return test vast xml. All video params are stored under placement in publishers UI
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
                            bidder: 'bidlab',
                            params: {
                                placementId: 0,
                                traffic: 'video'
                            }
                        }
                    ]
                }
            ];
```
