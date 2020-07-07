# Overview

```
Module Name: OneTag Bid Adapter
Module Type: Bidder Adapter
Maintainer: devops@onetag.com
```

# Description

OneTag Bid Adapter supports banner and video at present.

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
                bidder: "onetag",
                params: {
                    pubId: "your_publisher_id" // required, testing pubId: "386276e072"
                }
            }]
        }, {
            code: 'video-instream-space',
            mediaTypes: {
                video: {
                    context: "instream",
                    mimes: ["video/mp4", "video/webm", "application/javascript", "video/ogg"],
                    playerSize: [640,480]
                }
            },
            bids: [{
                bidder: "onetag",
                params: {
                    pubId: "your_publisher_id" // required, testing pubId: "386276e072"
                }
            }]
        }, {
            code: 'video-outstream-space',
            mediaTypes: {
                video: {
                    context: "outstream",
                    playerSize: [640,480]
                }
            },
            bids: [{
                bidder: "onetag",
                params: {
                    pubId: "your_publisher_id" // required, testing pubId: "386276e072"
                }
            }]
        }];
    
```
