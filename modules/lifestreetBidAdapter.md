# Overview

Module Name: Lifestreet Bid Adapter

Module Type: Lifestreet Adapter

Maintainer: hb.tech@lifestreet.com

# Description

Module that connects to Lifestreet's demand sources

# Test Parameters
```javascript
    var adUnits = [
        // Banner adUnit
        {
            code: 'test-ad',
            sizes: [[160, 600]],
            bids: [
                {
                    bidder: 'lifestreet',
                    params: {
                        slot: 'slot166704',
                        adkey: '78c',
                        ad_size: '160x600'
                    }
                }
            ]
        },
        // Video instream adUnit
        {
            code: 'test-video-ad',
            sizes: [[640, 480]],
            bids: [
                {
                    bidder: 'lifestreet',
                    params: {
                        slot: 'slot1227631',
                        adkey: 'a98',
                        ad_size: '640x480'
                    }
                }
            ]
        }
    ];
```
