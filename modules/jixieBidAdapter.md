# Overview

Module Name: Jixie Bidder Adapter
Module Type: Bidder Adapter
Maintainer: contact@jixie.io

# Description

Module that connects to Jixie demand source to fetch bids.
All prebid-supported user ids are sent to Jixie endpoint, if available. 

# Test Parameters
```
    var adUnits = [
        {
            code: 'demoslot1-div',
            mediaTypes: {
                banner: {
                    sizes: [
                        [300, 250]
                    ]
                }
            },
            bids: [
                {
                    bidder: 'jixie',
                    params: {
                        unit: "prebidsampleunit"
                    }
                }
            ]
        },
        {
            code: 'demoslot2-div',
            sizes: [640, 360],
            mediaTypes: {
                video: {
                    playerSize: [
                        [640, 360]
                    ],
                    context: "outstream"
                }
            },
            bids: [
                {
                    bidder: 'jixie',
                    params: {
                        unit: "prebidsampleunit"
                    }
                }
            ]
        },
        {
            code: 'demoslot3-div',
            sizes: [640, 360],
            mediaTypes: {
                video: {
                    playerSize: [
                        [640, 360]
                    ],
                    context: "instream"
                }
            },
            bids: [
                {
                    bidder: 'jixie',
                    params: {
                        unit: "prebidsampleunit"
                    }
                }
            ]
        }
    ];
```