# Overview

```
Module Name: mobfox Bidder Adapter
Module Type: mobfox Bidder Adapter
Maintainer: platform@mobfox.com
```

# Description

Module that connects to mobfox demand sources

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
                            bidder: 'mobfoxpb',
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
                            bidder: 'mobfoxpb',
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
                            bidder: 'mobfoxpb',
                            params: {
                                placementId: 'testNative'
                            }
                        }
                    ]
                }
            ];
```