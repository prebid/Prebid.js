# Overview

```
Module Name: Lifestreet Bid Adapter
Module Type: Lifestreet Adapter
Maintainer: hb.tech@lifestreet.com
```

# Description

Module that connects to Lifestreet's demand sources

Values, listed in `ALL_BANNER_SIZES` and `ALL_VIDEO_SIZES` are all the values which our server supports.
For `ad_size`, please use one of that values in following format: `ad_size: WIDTHxHEIGHT`

# Test Parameters
```javascript
    const ALL_BANNER_SIZES = [
      [120, 600], [160, 600], [300, 250], [300, 600], [320, 480],
      [320, 50], [468, 60], [510, 510], [600, 300],
      [720, 300], [728, 90], [760, 740], [768, 1024] 
    ];

    const ALL_VIDEO_SIZES = [
      [640, 480], [650, 520], [970, 580]
    ]
```

# Test Parameters (Banner)
```
    const adUnits = [
        {
            code: 'test-ad',
            mediaTypes: {
                banner: {
                    sizes: [[160, 600]],
                }
            },
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
    ];
```

# Test Parameters (Video)
```
    const adUnits = [
        {
            code: 'test-video-ad',
            mediaTypes: {
                video: {
                    playerSize: [[640, 480]],
                    context: 'instream'
                }
            },
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
