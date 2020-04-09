# Overview

```
Module Name: e_volution Bidder Adapter
Module Type: Bidder Adapter
```

# Description

Module that connects to e-volution-tech demand sources

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
                            bidder: 'e_volution',
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
                            bidder: 'e_volution',
                            params: {
                                placementId: 0,
                                traffic: 'video'
                            }
                        }
                    ]
                }
            ];
```
