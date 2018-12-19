# Overview

- Module Name: Conversant Bidder Adapter
- Module Type: Bidder Adapter
- Maintainer: mediapsr@conversantmedia.com

# Description

Module that connects to Conversant's demand sources.  Supports banners and videos.

# Test Parameters
```
var adUnits = [
    {
        code: 'banner-test-div',
        sizes: [[300, 250]],
        bids: [{
            bidder: "conversant",
            params: {
                site_id: '108060'
            }
        }]
    },{
        code: 'video-test-div',
        sizes: [640, 480],
        mediaTypes: {
            video: {
                context: 'instream',
                playerSize: [640, 480]
            }
        },
        bids: [{
            bidder: "conversant",
            params: {
                site_id: '88563',
                api: [2],
                protocols: [1, 2],
                mimes: ['video/mp4']
            }
        }]
    }];
```
