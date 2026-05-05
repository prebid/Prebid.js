# Overview

```
Module Name: TeqBlaze Demo Bidder Adapter
Module Type: TeqBlaze Demo Bidder Adapter
Maintainer: support@teqblaze.com
```

# Description

Connects to TeqBlaze Demo for bids.
TeqBlaze Demo bid adapter supports Banner, Video (instream and outstream) and Native.
This adapter is for internal testing only and should not be used for production integrations.

# Test Parameters
```
    var adUnits = [
                // Will return static test banner
                {
                    code: 'adunit1',
                    mediaTypes: {
                        banner: {
                            sizes: [ [300, 250], [320, 50] ],
                        }
                    },
                    bids: [
                        {
                            bidder: 'tqblz_demo',
                            params: {
                                placementId: 'testBanner',
                            }
                        }
                    ]
                },
                {
                    code: 'addunit2',
                    mediaTypes: {
                        video: {
                            playerSize: [ [640, 480] ],
                            context: 'instream',
                            minduration: 5,
                            maxduration: 60,
                        }
                    },
                    bids: [
                        {
                            bidder: 'tqblz_demo',
                            params: {
                                placementId: 'testVideo',
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
                            bidder: 'tqblz_demo',
                            params: {
                                placementId: 'testNative',
                            }
                        }
                    ]
                }
            ];
```
