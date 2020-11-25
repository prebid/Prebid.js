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
                placementId: 417846
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
                placementId: 417845
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
    }
];
```
