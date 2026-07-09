# Overview

```
Module Name: m152 Bidder Adapter
Module Type: m152 Bidder Adapter
Maintainer: info@152media.com
```

# Description

Connects to m152 exchange for bids.
m152 bid adapter supports Banner, Video (instream and outstream) and Native.

# Region Parameter

**Supported regions:**
- `eu` → `eu.152media-ssp.com`
- `us-east` → `east.152media-ssp.com`

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
                            bidder: 'm152',
                            params: {
                                placementId: 'testBanner',
                                region: 'us-east',
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
                            bidder: 'm152',
                            params: {
                                placementId: 'testVideo',
                                region: 'us-east',
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
                            bidder: 'm152',
                            params: {
                                placementId: 'testNative',
                                region: 'us-east',
                            }
                        }
                    ]
                }
            ];
```
