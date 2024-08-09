# Overview

```
Module Name: krushmedia Bidder Adapter
Module Type: krushmedia Bidder Adapter
Maintainer: adapter@krushmedia.com
```

# Description

Module that connects to krushmedia demand sources

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
                            bidder: 'krushmedia',
                            params: {
                                key: 0,
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
                            bidder: 'krushmedia',
                            params: {
                                key: 0,
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
                            bidder: 'krushmedia',
                            params: {
                                key: 0,
                                traffic: 'native'
                            }
                        }
                    ]
                }
            ];
```
