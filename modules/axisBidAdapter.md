# Overview

```
Module Name: Axis Bidder Adapter
Module Type: Axis Bidder Adapter
Maintainer: help@axis-marketplace.com
```

# Description

Connects to Axis exchange for bids.
Axis bid adapter supports Banner, Video (instream and outstream) and Native.

# Test Parameters
```
    var adUnits = [
                // Will return static test banner
                {
                    code: 'adunit1',
                    mediaTypes: {
                        banner: {
                            sizes: [ [300, 250], [320, 50] ],
                            pos: 1
                        }
                    },
                    bids: [
                        {
                            bidder: 'axis',
                            params: {
                                integration: '000000',
                                token: '000000'
                            }
                        }
                    ]
                },
                {
                    code: 'addunit2',
                    mediaTypes: {
                        video: {
                            playerSize: [ [640, 480] ],
                            minduration: 5,
                            maxduration: 60,
                            pos: 1
                        }
                    },
                    bids: [
                        {
                            bidder: 'axis',
                            params: {
                                integration: '000000',
                                token: '000000'
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
                            bidder: 'axis',
                            params: {
                                integration: '000000',
                                token: '000000'
                            }
                        }
                    ]
                }
            ];
```
