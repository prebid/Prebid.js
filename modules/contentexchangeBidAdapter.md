# Overview

```
Module Name: Contentexchange Bidder Adapter
Module Type: Contentexchange Bidder Adapter
Maintainer: no-reply@vsn.si
```

# Description

Connects to Contentexchange exchange for bids.

Contentexchange bid adapter supports Banner, Video (instream and outstream) and Native.

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
                            bidder: 'contentexchange',
                            params: {
                                placementId: '0',
                                adFormat: 'banner'
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
                            bidder: 'contentexchange',
                            params: {
                                placementId: '0',
                                adFormat: 'video'
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
                            bidder: 'contentexchange',
                            params: {
                                placementId: '0',
                                adFormat: 'native'
                            }
                        }
                    ]
                }
            ];
```