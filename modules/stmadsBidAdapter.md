# Overview

```
Module Name: StreamAds Bidder Adapter
Module Type: StreamAds Bidder Adapter
Maintainer: support@streamads.media
```

# Description

Connects to StreamAds exchange for bids.
StreamAds bid adapter supports Banner, Video (instream and outstream) and Native.

# Multiformat Ad Units

StreamAds sends one format per placement. When an ad unit offers multiple formats,
the adapter selects banner first, then video, then native.

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
                            bidder: 'stmads',
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
                            bidder: 'stmads',
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
                            bidder: 'stmads',
                            params: {
                                placementId: 'testNative',
                            }
                        }
                    ]
                }
            ];
```
