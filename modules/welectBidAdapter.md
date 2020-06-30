# Overview

```
Module Name: Welect Bidder Adapter
Module Type: Welect Adapter
Maintainer: nick.duitz@9elements.com
```

# Description

Module that connects to Welect's demand sources

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
                    bidder: "Welect",
                    params: {
                        placementAlias: "prebid-preview",
                        domaint: "www.welect.de"
                    }
                }
            ]
        }
    ];