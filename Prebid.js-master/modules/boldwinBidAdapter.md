# Overview

```
Module Name: boldwin Bidder Adapter
Module Type: boldwin Bidder Adapter
```

# Description

Module that connects to boldwin demand sources

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
                            bidder: 'boldwin',
                            params: {
                                placementId: 'testBanner',
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
                            bidder: 'boldwin',
                            params: {
                                placementId: 'testVideo',
                            }
                        }
                    ]
                }
            ];
```
