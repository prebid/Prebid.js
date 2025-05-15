# Overview

```
Module Name:  SUIM Bid Adapter
Module Type:  Bidder Adapter
Maintainer: prebid@suimad.com
```

# Description

Module that connects to SUIM AD Platform.
Supports Banner.

# Test Parameters

```
var adUnits = [
    // Banner adUnit
    {
        code: 'test-div',
        mediaTypes: {
            banner: {
                sizes: [
                    [1, 1],
                    [360, 360],
                    [480, 270],
                    [320, 50],
                    [970, 250],
                    [300, 250],
                    [728, 90],
                    [300, 600],
                    [320, 100],
                ]
            }
        },
        bids: [{
            bidder: 'suim',
            params: {
                ad_space_id: '01hw085aphq9qdtnwgdnm5q5b8'
            }
        }]
    }
];
```
