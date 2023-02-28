# Overview

```
Module Name:  Kulture Media Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   devops@kulture.media
```

# Description

Module that connects to Kulture Media's demand sources.
Kulture Media bid adapter supports Banner and Video.


# Test Parameters

## Banner

```
var adUnits = [
    {
        code: 'banner-ad-div',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [300,600]]
            }
        },
        bids: [{
            bidder: 'kulturemedia',
            params: {
                placementId: 'test',
                publisherId: 'test',
            }
        }]
    }
];
```

## Video

We support the following OpenRTB params that can be specified in `mediaTypes.video` or in `bids[].params.video`
- 'mimes',
- 'minduration',
- 'maxduration',
- 'placement',
- 'protocols',
- 'startdelay',
- 'skip',
- 'skipafter',
- 'minbitrate',
- 'maxbitrate',
- 'delivery',
- 'playbackmethod',
- 'api',
- 'linearity'
