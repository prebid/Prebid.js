# Overview

- Module Name: Epsilon Bidder Adapter
- Module Type: Bidder Adapter
- Maintainer: mediapsr@epsilon.com

# Description

Module that connects to Epsilon's (formerly Conversant) demand sources.  Supports banners and videos.

# Test Parameters
```
var adUnits = [
    {
        code: 'banner-test-div',
        mediaTypes: {
            banner: {        
                sizes: [[300, 250],[300,600]]
            }
        },
        bids: [{
            bidder: "conversant",
            params: {
                site_id: '108060'
            }
        }]
    },{
        code: 'video-test-div',
        mediaTypes: {
            video: {
                context: 'instream',
                playerSize: [640, 480],
                api: [2],
                protocols: [1, 2],
                mimes: ['video/mp4']
            }
        },
        bids: [{
            bidder: "conversant",
            params: {
                site_id: '108060',
                white_label_url: 'https://web.hb.ad.cpe.dotomi.com/s2s/header/24'
            }
        }]
    }];
```
