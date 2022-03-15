# Overview

```
Module Name: SmartHub Bidder Adapter
Module Type: SmartHub Bidder Adapter
Maintainer: support@smart-hub.io
```

# Description

Connects to SmartHub exchange for bids.

SmartHub bid adapter supports Banner, Video (instream and outstream) and Native.

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
                            bidder: 'smarthub',
                            params: {
                                partnerName: 'pbjstest',
                                seat: 'testSeat',
                                token: 'testBanner',
                                iabCat: ['IAB1-1', 'IAB3-1', 'IAB4-3'],
                                minBidfloor: 10,
                                pos: 1,
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
                        }
                    },
                    bids: [
                        {
                            bidder: 'smarthub',
                            params: {
                                partnerName: 'pbjstest',
                                seat: 'testSeat',
                                token: 'testVideo',
                                iabCat: ['IAB1-1', 'IAB3-1', 'IAB4-3'],
                                minBidfloor: 10,
                                pos: 1,
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
                            bidder: 'smarthub',
                            params: {
                                partnerName: 'pbjstest',
                                seat: 'testSeat',
                                token: 'testNative',
                                iabCat: ['IAB1-1', 'IAB3-1', 'IAB4-3'],
                                minBidfloor: 10,
                                pos: 1,
                            }
                        }
                    ]
                }
            ];
```
