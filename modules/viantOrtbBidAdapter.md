# Overview

Module Name: VIANT Bidder Adapter
Module Type: Bidder Adapter
Maintainer: Marketplace@adelphic.com

# Description

An adapter to get a bid from VIANT DSP.

# Test Parameters
```javascript
    var adUnits = [            // Banner adUnit with only required parameters
        {
            code: 'test-div-minimal',
            mediaTypes: {
                banner: {
                    sizes: [[728, 90]]
                }
            },
            bids: [
                {
                    bidder: 'viant',
                    params: {
                        supplySourceId: 'supplier',
                        publisherId: '464'
                    }
                }
            ]
        },
        {
            code: 'test-div-minimal-video',
            mediaTypes: {
                video: {
                    playerSize: [640, 480],
                    context: 'outstream'
                }
            },
            bids: [
                {
                    bidder: 'viant',
                    params: {
                        supplySourceId: 'supplier',
                        publisherId: '464' // required
                    }
                }
            ]
        }    
    ];
```

Where:

* placementId - Placement ID of the ad unit (required)
