# Overview

```
Module Name: Clicktripz Bidder Adapter
Module Type: Bidder Adapter
Maintainer: integration-support@clicktripz.com
```

# Description
Our module makes it easy to integrate Clicktripz demand sources into your website.

Supported Ad Fortmats:
* Banner

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250], [300,600]],
                }
            },
            bids: [
                {
                    bidder: "clicktripz",
                    params: {
                        placementId: '4312c63f',
                        siteId: 'prebid',
                    }
                }
            ]
        }
    ];
