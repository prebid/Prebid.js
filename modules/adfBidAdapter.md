# Overview

Module Name: Adf Adapter
Module Type: Bidder Adapter
Maintainer: Scope.FL.Scripts@adform.com

# Description

Module that connects to Adform demand sources to fetch bids.
Banner, video and native formats are supported. Using OpenRTB standard. Previous adapter name - adformOpenRTB.

# Test Parameters
```
    var adUnits = [{
        code: '/19968336/prebid_native_example_1',
        mediaTypes: {
            native: {
                image: {
                    required: false,
                    sizes: [100, 50]
                },
                title: {
                    required: false,
                    len: 140
                },
                sponsoredBy: {
                    required: false
                },
                clickUrl: {
                    required: false
                },
                body: {
                    required: false
                },
                icon: {
                    required: false,
                    sizes: [50, 50]
                }
            }
        },
        bids: [{
            bidder: 'adf',
            params: {
                mid: 606169,                 // required
                adxDomain: 'adx.adform.net'  // optional
            }
        }]
    }, {
        code: '/19968336/prebid_banner_example_1',
        mediaTypes: {
            banner: {
                sizes: [[ 300, 250 ]]
            }
        }
        bids: [{
            bidder: 'adf',
            params: {
                mid: 1038466
            }
        }]
    }, {
        code: '/19968336/prebid_video_example_1',
        mediaTypes: {
            video: {
                context: 'outstream',
                mimes: ['video/mp4']
            }
        }
        bids: [{
            bidder: 'adf',
            params: {
                mid: 822732
            }
        }]
    }];
```
