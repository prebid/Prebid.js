# Overview

```
Module Name: Vuble Bidder Adapter
Module Type: Vuble Adapter
Maintainer: gv@mediabong.com
```

# Description

Module that connects to Vuble's demand sources

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-video-instream',
            sizes: [[640, 360]],
            mediaTypes: {
                video: {
                    context: 'instream'
                }
            },
            bids: [
                {
                    bidder: "vuble",
                    params: {
                        env: 'net',
                        pubId: '18',
                        zoneId: '12345',
                        referrer: "http://www.vuble.tv/", // optional
                        floorPrice: 5.00 // optional
                    }
                }
            ]
        },
        {
            code: 'test-video-outstream',
            sizes: [[640, 360]],
            mediaTypes: {
                video: {
                    context: 'outstream'
                }
            },
            bids: [
                {
                    bidder: "vuble",
                    params: {
                        env: 'net',
                        pubId: '18',
                        zoneId: '12345',
                        referrer: "http://www.vuble.tv/", // optional
                        floorPrice: 5.00 // optional
                    }
                }
            ]
        }
    ];