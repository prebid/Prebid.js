# Overview

Module Name: Beachfront Bid Adapter

Module Type: Bidder Adapter

Maintainer: john@beachfront.com

# Description

Module that connects to Beachfront's demand sources

# Test Parameters
```javascript
    var adUnits = [
        {
            code: 'test-video',
            mediaTypes: {
                video: {
                    context: 'instream',
                    playerSize: [ 640, 360 ]
                }
            },
            bids: [
                {
                    bidder: 'beachfront',
                    params: {
                        bidfloor: 0.01,
                        appId: '11bc5dd5-7421-4dd8-c926-40fa653bec76',
                        video: {
                            mimes: [ 'video/mp4', 'application/javascript' ]
                        }
                    }
                }
            ]
        }, {
            code: 'test-banner',
            mediaTypes: {
                banner: {
                    sizes: [ 300, 250 ]
                }
            },
            bids: [
                {
                    bidder: 'beachfront',
                    params: {
                        bidfloor: 0.01,
                        appId: '3b16770b-17af-4d22-daff-9606bdf2c9c3'
                    }
                }
            ]
        }
    ];
```

# Multi-Format Ad Unit Example
```javascript
    var adUnits = [
        {
            code: 'test-video-banner',
            mediaTypes: {
                video: {
                    context: 'outstream',
                    playerSize: [ 640, 360 ]
                },
                banner: {
                    sizes: [ 300, 250 ]
                }
            },
            bids: [
                {
                    bidder: 'beachfront',
                    params: {
                        video: {
                            bidfloor: 0.01,
                            appId: '11bc5dd5-7421-4dd8-c926-40fa653bec76',
                            mimes: [ 'video/mp4', 'application/javascript' ]
                        },
                        banner: {
                            bidfloor: 0.01,
                            appId: '3b16770b-17af-4d22-daff-9606bdf2c9c3'
                        }
                    }
                }
            ]
        }
    ];
```
