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
                {
                    code:'1',
                    mediaTypes:{
                        banner: {
                            sizes: [[300, 250]],
                        },
                        video: {
                            playerSize: [640, 480],
                            context: 'instream'
                        },
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
                    bids:[
                        {
                            bidder: 'lunamediahb',
                            params: {
                                placementId: 0
                            }
                        },
                        {
                            bidder: 'lunamediahb',
                            params: {
                                placementId: 0
                            }
                        },
                        {
                            bidder: 'lunamediahb',
                            params: {
                                placementId: 0
                            }
                        }
                    ]
                }
            ];
```
