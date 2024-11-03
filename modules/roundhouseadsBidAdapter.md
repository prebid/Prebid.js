# RoundhouseAds Bidder Adapter

## Overview

- **Module Name**: RoundhouseAds Bidder Adapter
- **Module Type**: Bidder Adapter
- **Maintainer**: info@roundhouseads.com

# Description

Module that connects to RoundhouseAds' demand sources to fetch bids.

The RoundhouseAds bid adapter supports Banner, Video, and Native ad formats.

# Test Parameters

```js
var adUnits = [
    // Banner adUnit with only required parameters
    {
        code: 'test-div-banner-minimal',
        mediaTypes: {
            banner: {
                sizes: [[300, 250]]
            }
        },
        bids: [
            {
                bidder: 'roundhouseads',
                params: {
                    publisherId: 'your-publisher-id'
                }
            }
        ]
    },
    // Banner adUnit with all optional parameters provided
    {
        code: 'test-div-banner-full',
        mediaTypes: {
            banner: {
                sizes: [[728, 90]]
            }
        },
        bids: [
            {
                bidder: 'roundhouseads',
                params: {
                    publisherId: 'your-publisher-id',
                    placementId: 'your-placement-id',
                    bidfloor: 0.50,
                    banner: {
                        pos: 1
                    }
                }
            }
        ]
    },
    // Native adUnit with only required parameters
    {
        code: 'test-div-native-minimal',
        mediaTypes: {
            native: {
                title: { required: true, len: 80 },
                image: { required: true, sizes: [150, 150] },
                sponsoredBy: { required: true }
            }
        },
        bids: [
            {
                bidder: 'roundhouseads',
                params: {
                    publisherId: 'your-publisher-id'
                }
            }
        ]
    },
    // Native adUnit with all optional parameters provided
    {
        code: 'test-div-native-full',
        mediaTypes: {
            native: {
                title: { required: true, len: 80 },
                body: { required: true, len: 200 },
                image: { required: true, sizes: [300, 250] },
                icon: { required: false, sizes: [50, 50] },
                sponsoredBy: { required: true },
                clickUrl: { required: true }
            }
        },
        bids: [
            {
                bidder: 'roundhouseads',
                params: {
                    publisherId: 'your-publisher-id',
                    placementId: 'your-placement-id',
                    native: {
                        language: 'en'
                    }
                }
            }
        ]
    },
    // Video adUnit with only required parameters
    {
        code: 'test-div-video-minimal',
        mediaTypes: {
            video: {
                context: 'instream',
                playerSize: [640, 480],
                mimes: ['video/mp4'],
                protocols: [2, 3, 5, 6]
            }
        },
        bids: [
            {
                bidder: 'roundhouseads',
                params: {
                    publisherId: 'your-publisher-id'
                }
            }
        ]
    },
    // Video adUnit with all optional parameters provided
    {
        code: 'test-div-video-full',
        mediaTypes: {
            video: {
                minduration: 1,
                maxduration: 60,
                playerSize: [640, 480],
                api: [1, 2],
                mimes: ['video/mp4'],
                protocols: [2, 3, 5, 6],
                skip: 1,
                skipmin: 5,
                skipafter: 15
            }
        },
        bids: [
            {
                bidder: 'roundhouseads',
                params: {
                    publisherId: 'your-publisher-id',
                    placementId: 'your-placement-id',
                    bidfloor: 0.75,
                    video: {
                        language: 'en'
                    }
                }
            }
        ]
    }
];