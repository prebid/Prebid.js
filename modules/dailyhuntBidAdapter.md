# Overview

```
Module Name:  Dailyhunt Bid Adapter
Module Type:  Bidder Adapter
Maintainer: Dailyhunt
```

# Description

Connects to dailyhunt for bids.

Dailyhunt bid adapter supports Banner, Native and Video.

# Test Parameters
```
    var adUnits = [
        {
            code: '/83414793/prebid_test_display',
            sizes: [[300, 250], [320, 50]],
            mediaTypes: {
                banner : {
                    sizes: [[300, 250], [320, 50]],
                }
            },
            bids: [
                {
                    bidder: 'dailyhunt',
                    params: {
                        placement_id: 1,
                        publisher_id: 1,
                        partner_name: 'dailyhunt',
                        device: {
                            ip: "182.23.143.212"
                        }
                    }
                }
            ]
        },
        {
            code: '/83414793/prebid_test_native',
            sizes: [[300, 250]],
            mediaTypes: {
                native: {
                    title: {
                        required: true
                    },
                    body: {
                        required: true
                    },
                    image: {
                        required: true
                    },
                    cta: {
                        required: true
                    }
                }
            },
            bids: [
                {
                    bidder: 'dailyhunt',
                    params: {
                        placement_id: 1,
                        publisher_id: 1,
                        partner_name: 'dailyhunt',
                        device: {
                            ip: "182.23.143.212"
                        }
                    }
                }
            ]
        },
        {
            code: '/83414793/prebid_test_video',
            mediaTypes: {
                video: {
                    playerSize: [1280, 720],
                    context: 'instream'
                }
            },
            bids: [
                {
                    bidder: 'dailyhunt',
                    params: {
                        placement_id: 1,
                        publisher_id: 1,
                        partner_name: 'dailyhunt',
                        device: {
                            ip: "182.23.143.212"
                        },
                        video: {
                            mimes: [
                                'video/mp4'
                            ]
                        }
                    }
                }
            ]
        }
    ];
```
