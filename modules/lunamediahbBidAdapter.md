# Overview

```
Module Name: lunamedia Bidder Adapter
Module Type: lunamedia Bidder Adapter
Maintainer: support@lunamedia.io
```

# Description

Module that connects to lunamedia demand sources

# Test Parameters
```
    var adUnits = [
                // Will return static test banner
                {
                    code: 'adunit1',
                    mediaTypes: {
                        banner: {
                            sizes: [[300, 250]],
                        }
                    },
                    bids: [
                        {
                            bidder: 'luna',
                            params: {
                                placementId: 0,
                                traffic: 'banner'
                            }
                        }
                    ]
                },
                // Will return test vast xml. All video params are stored under placement in publishers UI
                {
                    code: 'addunit2',
                    mediaTypes: {
                        video: {
                            playerSize: [640, 480],
                            context: 'instream'
                        }
                    },
                    bids: [
                        {
                            bidder: 'luna',
                            params: {
                                placementId: 0,
                                traffic: 'video'
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
                            bidder: 'luna',
                            params: {
                                placementId: 0,
                                traffic: 'native'
                            }
                        }
                    ]
                }
            ];
```
