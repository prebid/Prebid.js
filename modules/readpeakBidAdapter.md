# Overview

Module Name: ReadPeak Bid Adapter

Module Type: Bidder Adapter

Maintainer: devteam@readpeak.com

# Description

Module that connects to ReadPeak's demand sources

This adapter requires setup and approval from ReadPeak.
Please reach out to your account team or hello@readpeak.com for more information.

# Test Parameters
```javascript
    var adUnits = [
        {
            code: '/19968336/prebid_native_example_2',
            mediaTypes: {
                native: {
                    title: {
                        required: true
                    },
                    image: {
                        required: true
                    },
                    body: {
                        required: true
                    },
                }
            },
            bids: [{
                bidder: 'readpeak',
                params: {
                    bidfloor: 5.00,
                    publisherId: 'test',
                    siteId: 'test',
                    tagId: 'test-tag-1'
                },
            }]
        },
        {
            code: '/19968336/prebid_banner_example_2',
            mediaTypes: {
                banner: {
                    sizes: [[640, 320], [300, 600]],
                }
            },
            bids: [{
                bidder: 'readpeak',
                params: {
                    bidfloor: 5.00,
                    publisherId: 'test',
                    siteId: 'test',
                    tagId: 'test-tag-2'
                },
            }]
        }
    ];
```
