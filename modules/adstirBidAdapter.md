# Overview

```
Module Name: adstir Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@ad-stir.com
```

# Description

Module that connects to adstir's demand sources

Prebid.js version 8.24.0 or above is required to use this adapter.

# Test Parameters

```
    var adUnits = [
        // Banner adUnit
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],
                }
            },
            bids: [
                {
                    bidder: 'adstir',
                    params: {
                        appId: 'TEST-MEDIA',
                        adSpaceNo: 1,
                    }
                }
            ]
        }
    ];
```
