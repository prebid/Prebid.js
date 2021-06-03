# Overview

```
Module Name: Bidmyadz Bidder Adapter
Module Type: Bidmyadz Bidder Adapter
Maintainer: contact@bidmyadz.com
```

# Description

Connects to Bidmyadz exchange for bids.

Bidmyadz bid adapter supports Banner, Video (instream and outstream) and Native.

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
                            bidder: 'bidmyadz',
                            params: {
                                placementId: 'test',
                                traffic: 'banner'
                            }
                        }
                    ]
                },
                {
                    code: 'addunit2',
                    mediaTypes: {
                        video: {
                            playerSize: [640, 480],
                            context: 'instream'
                        }
                    },
                    bids: [
                        {
                            bidder: 'bidmyadz',
                            params: {
                                placementId: 'test',
                                traffic: 'video'
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
                            bidder: 'bidmyadz',
                            params: {
                                placementId: 'test',
                                traffic: 'native'
                            }
                        }
                    ]
                }
            ];
```
