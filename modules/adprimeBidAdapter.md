# Overview

```
Module Name: adprime Bidder Adapter
Module Type: adprime Bidder Adapter
```

# Description

Module that connects to adprime demand sources

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
                            bidder: 'adprime',
                            params: {
                                placementId: 0,
                                traffic: 'banner',
                                keywords: ['cat_1', 'cat_2']

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
                            bidder: 'adprime',
                            params: {
                                placementId: 0,
                                traffic: 'video',
                                keywords: ['cat_1', 'cat_2']

                            }
                        }
                    ]
                }
            ];
```
