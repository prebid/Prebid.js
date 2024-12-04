# Overview

```markdown
Module Name: Michao Bidder Adapter
Module Type: Bidder Adapter
Maintainer: miyamoto.kai@lookverin.com
```

# Description

Module that connects to Michao’s demand sources

Supported Ad format:
* Banner
* Video (instream and outstream)
* Native

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
            bidder: 'michao',
            params: {
                site: 1,
                placement: '1',
            }
        }]
    },
    // Video adUnit
    {
        code: 'video-div',
        mediaTypes: {
            video: {
                context: 'outstream',
                playerSize: [640, 480],
                minduration: 0,
                maxduration: 120,
                mimes: ['video/mp4'],
                protocols: [7]
            }
        },
        bids: [{
            bidder: 'michao',
            params: {
                site: 1,
                placement: '1',
            }
        }]
    },
    // Native AdUnit
    {
        code: 'native-div',
        mediaTypes: {
            native: {
                ortb: {
                    assets: [
                        {
                            id: 1,
                            required: 1,
                            img: {
                                type: 3,
                                w: 989,
                                h: 742,
                            },
                        },
                    ]
                }
            }
        },
        bids: [{
            bidder: 'michao',
            params: {
                site: 1,
                placement: '1',
            }
        }]
    }
];
```
