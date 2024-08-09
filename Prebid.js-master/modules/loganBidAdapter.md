# Overview

```
Module Name: logan Bidder Adapter
Module Type: logan Bidder Adapter
Maintainer: support@logan.ai
```

# Description

Module that connects to logan demand sources

# Test Parameters
```
    var adUnits = [
                {
                    code:'1',
                    mediaTypes:{
                        banner: {
                            sizes: [[300, 250]],
                        }
                    },
                    bids:[
                        {
                            bidder: 'logan',
                            params: {
                                placementId: 'testBanner'
                            }
                        }
                    ]
                },
                {
                    code:'1',
                    mediaTypes:{
                        video: {
                            playerSize: [640, 480],
                            context: 'instream'
                        }
                    },
                    bids:[
                        {
                            bidder: 'logan',
                            params: {
                                placementId: 'testVideo'
                            }
                        }
                    ]
                },
                {
                    code:'1',
                    mediaTypes:{
                        native: {
                            title: {
                                required: true
                            },
                            icon: {
                                required: true,
                                size: [64, 64]
                            }
                        }
                    },
                    bids:[
                        {
                            bidder: 'logan',
                            params: {
                                placementId: 'testNative'
                            }
                        }
                    ]
                }
            ];
```