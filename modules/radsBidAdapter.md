# Overview

```
Module Name: RADS Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@recognified.net
```

# Description

RADS Bidder Adapter for Prebid.js 1.x

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [
                      [300, 250],
                      [300, 600],
                    ],  // ad display size
                }
            },
            bids: [
                {
                    bidder: "rads",
                    params: {
                        placement: '101',
                        pfilter: {
                            floorprice: 1000000, // EUR * 1,000,000,
                        }
                    }
                }
            ]
        }, {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[320, 50]]   // mobile ad size
                }
            },
            bids: [
                {
                    bidder: "rads",
                    params: {
                        placement: 101
                    }
                }
            ]
        },
        {
            // video settings
            code: 'video-obj',
            mediaTypes: {
                video: {
                    context: 'instream',
                    playerSize: [640, 480]
                }
            },
            bids: [
                {
                    bidder: "rads",
                    params: {
                        placement: "...", // placement ID of inventory with RADS
                        vastFormat: "vast2|vast4" // default vast2 
                    }
                 }
            ]
        }
    ];
```

Required param field is only `placement`. 

