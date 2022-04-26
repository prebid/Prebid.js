# Overview

```
Module Name:  Buzzoola Bid Adapter
Module Type:  Bidder Adapter
Maintainer: devteam@buzzoola.com
```

# Description

Connects to Buzzoola exchange for bids.

Buzzoola bid adapter supports Banner and Video (instream and outstream).

# Test Parameters
```
var adUnits = [
    // Banner adUnit
    {
        code: 'banner-div',
        mediaTypes: {
            banner: {
                sizes: [[240, 400], [300, 600]],
            }
        },
        bids: [{
            bidder: 'buzzoola',
            params: {
                placementId: 417845
            }
        }]
    },
    // Video instream adUnit
    {
        code: 'video-instream',
        mediaTypes: {
            video: {
                context: 'instream',
                playerSize: [640, 380],
                mimes: ['video/mp4'],
                minduration: 1,
                maxduration: 2,
            }
        },
        bids: [{
            bidder: 'buzzoola',
            params: {
                placementId: 417846
            }
        }]
    },
    // Video outstream adUnit
    {
        code: 'video-outstream',
        mediaTypes: {
            video: {
                context: 'outstream',
                playerSize: [640, 380],
                mimes: ['video/mp4'],
                minduration: 1,
                maxduration: 2,
            }
        },
        bids: [{
            bidder: 'buzzoola',
            params: {
                placementId: 417845
            }
        }]
    },
    // Native adUnit
    {
        code: '/21737252144/prebid_test_native',
        mediaTypes: {
            native: {
                image: {
                    required: true,
                    sizes: [640, 134]
                },
                title: {
                    required: true,
                    len: 80
                },
                sponsoredBy: {
                    required: true
                },
                clickUrl: {
                    required: true
                },
                privacyLink: {
                    required: false
                },
                body: {
                    required: true
                },
                icon: {
                    required: true,
                    sizes: [50, 50]
                }
            }
        },
        bids: [{
            bidder: 'buzzoola',
            params: {
                placementId: 417845
            }
        }]
    }
];
```
