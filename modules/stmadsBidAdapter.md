# Overview

```
Module Name: StreamAds Bidder Adapter
Module Type: StreamAds Bidder Adapter
Maintainer: support@streamads.media
```

# Description

Connects to StreamAds exchange for bids.
StreamAds bid adapter supports Banner, Video (instream and outstream) and Native.

# Media Type Selection

Set `params.mediaType` to `banner`, `video`, or `native` when an ad unit offers
multiple supported formats. StreamAds requests only the selected format.
Bids without a selection on multiformat ad units, or with a selection absent
from `mediaTypes`, are rejected. For single-format ad units this parameter is optional.

Example bidder parameters: `{ placementId: 'testVideo', mediaType: 'video' }`.

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
