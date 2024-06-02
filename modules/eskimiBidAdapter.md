# Overview

Module Name: ESKIMI Bidder Adapter
Module Type: Bidder Adapter
Maintainer: tech@eskimi.com

# Description

Module that connects to Eskimi demand sources to fetch bids using OpenRTB standard.
Banner and video formats are supported.

# Test Parameters
```javascript
    var adUnits = [{
        code: '/19968336/prebid_banner_example_1',
        mediaTypes: {
            banner: {
                sizes: [[ 300, 250 ]],
                ... // battr
            }
        },
        bids: [{
            bidder: 'eskimi',
            params: {
                placementId: 612,
                ... // bcat, badv, bapp
            }
        }]
    }, {
        code: '/19968336/prebid_video_example_1',
        mediaTypes: {
            video: {
                context: 'outstream',
                mimes: ['video/mp4'],
                api: [1, 2, 4, 6],
                ... // Aditional ORTB video params (including battr)
            }
        },
        bids: [{
            bidder: 'eskimi',
            params: {
                placementId: 612,
                ... // bcat, badv, bapp
            }
        }]
    }];
```

Where:

* placementId - Placement ID of the ad unit (required)
* bcat, badv, bapp, battr - ORTB blocking parameters as specified by OpenRTB 2.5

