# Overview

**Module Name**: Adxcg Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: info@adxcg.com

# Description

Module that connects to an Adxcg.com zone to fetch bids.

# Test Parameters
```
var adUnits = [{
            code: 'banner-ad-div',
            mediaTypes: {
                banner: {
                    sizes: [
                        [300, 250],
                        [300, 600]
                    ]
                }
            },
            bids: [{
                bidder: 'adxcg',
                params: {
                    adzoneid: '1'
                }
            }]
        }, {
            code: 'native-ad-div',
            mediaTypes: {
                native: {
                    image: {
                        sendId: false,
                        required: true,
                        sizes: [80, 80]
                    },
                    title: {
                        required: true,
                        len: 75
                    },
                    body: {
                        required: true,
                        len: 200
                    },
                    sponsoredBy: {
                        required: false,
                        len: 20
                    }
                }
            },
            bids: [{
                    bidder: 'adxcg',
                    params: {
                        adzoneid: '2379'
                    }
                }
            }]
    },
    {
        code: 'video-div',
        mediaTypes: {
            video: {
                playerSize: [640, 480],
                context: 'instream'
            }
        },
        bids: [{
            bidder: 'adxcg',
            params: {
                adzoneid: '20',
                video: {
                    maxduration: 100,
                    mimes: ['video/mp4'],
                    skippable: true,
                    playback_method: ['auto_play_sound_off']
                }
            }
        }]
    }
    ];
```
