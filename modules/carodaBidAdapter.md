# Overview

Module Name: Caroda Adapter
Module Type: Bidder Adapter
Maintainer: dev@caroda.io

# Description

Module that connects to Caroda demand sources to fetch bids.
Banner and video formats are supported. 
Use `caroda` as bidder.

# Test Parameters
```
    var adUnits = [{
        code: '/19968336/prebid_banner_example_1',
        mediaTypes: {
            banner: {
                sizes: [[ 300, 250 ]]
            }
        }
        bids: [{
            bidder: 'caroda',
            params: {
                ctok: '230ce9490c5434354'
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
            bidder: 'caroda',
            params: {
                ctok: '230ce9490c5434354'
            }
        }]
    }];
```
