# Overview

**Module Name:** Bidfuse Bidder Adapter

**Module Type:** Bidder Adapter

**Maintainer:** support@bidfuse.com

# Description

Module that connects to Bidfuse's Open RTB demand sources.

# Test Parameters
```js
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
                            bidder: 'bidfuse',
                            params: {
                                placementId: 'testBanner',
                                endpointId: 'testBannerEndpoint'
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
                            bidder: 'bidfuse',
                            params: {
                                placementId: 'testVideo',
                                endpointId: 'testVideoEndpoint'
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
                            bidder: 'bidfuse',
                            params: {
                                placementId: 'testNative',
                                endpointId: 'testNativeEndpoint'
                            }
                        }
                    ]
                }
            ];
```
