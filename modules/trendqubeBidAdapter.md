# Overview

```
Module Name: trendqube Bidder Adapter
Module Type: trendqube Bidder Adapter
```

# Description

Module that connects to trendqube demand sources

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
                            bidder: 'trendqube',
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
                            bidder: 'trendqube',
                            params: {
                                placementId: 0,
                                traffic: 'video'
                            }
                        }
                    ]
                }
            ];
```
