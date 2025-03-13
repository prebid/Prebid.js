# Overview

```
Module Name: IncrementX Bid Adapter
Module Type: Bidder Adapter
Maintainer: prebid-team@vertoz.com
```

# Description

IncrementX Bid Adapter supports banner and video at present.

# Test Parameters
```
    var adUnits = [
        {
            code: "banner-space",
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]]
                }
            },
            bids: [{
                bidder: "incrementx",
                params: {
                    placementId: "your_placementId" // required,
                }
            }]
        }, 
             {
            code: 'video-instream-space',
            mediaTypes: {
                video: {
                        context: 'instream',
                        playerSize: [640, 480],
                        mimes: ['video/mp4'],
                        protocols: [1, 2, 3, 4, 5, 6, 7, 8],
                        playbackmethod: [2],
                        skip: 1
                       }
                        },
            bids: [{
                bidder: "incrementx",
                params: {
                    placementId: "your_placement_id" // required,
                }
            }]
        },
         {
            code: 'video-outstream-space',
            mediaTypes: {
                video: {
                    context: "outstream",
                    playerSize: [640,480]
                }
            },
            bids: [{
                bidder: "incrementx",
                params: {
                    placementId: "your_placement_id" // required,
                }
            }]
        }];
    
```
