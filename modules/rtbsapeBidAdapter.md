# Overview

```
Module Name:  RtbSape Bid Adapter
Module Type:  Bidder Adapter
Maintainer:  sergey@sape.ru
```

# Description
Our module makes it easy to integrate RtbSape demand sources into your website.

Supported Ad format:
* Banner
* Video (instream and outstream)

# Test Parameters
```
var adUnits = [
    // Banner adUnit
    {
        code: 'banner-div',
        mediaTypes: {
            banner: {
                sizes: [[300, 250]],
            }
        },
        bids: [{
            bidder: 'rtbsape',
            params: {
                placeId: 553307
            }
        }]
    },
    // Video adUnit
    {
        code: 'video-div',
        mediaTypes: {
            video: {
                context: 'outstream',
                playerSize: [600, 340]
            }
        },
        bids: [{
            bidder: 'rtbsape',
            params: {
                placeId: 553309
            }
        }]
    }
];
```
