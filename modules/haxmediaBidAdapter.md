# Overview

```
Module Name: haxmedia Bidder Adapter
Module Type: haxmedia Bidder Adapter
Maintainer: haxmixqk@haxmediapartners.io
```

# Description

Module that connects to haxmedia demand sources

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
                            bidder: 'haxmedia',
                            params: {
                                placementId: 0
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
                            bidder: 'haxmedia',
                            params: {
                                placementId: 0
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
                            bidder: 'haxmedia',
                            params: {
                                placementId: 0
                            }
                        }
                    ]
                }
            ];
```
