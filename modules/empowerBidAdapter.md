# Overview

Module Name: Empower Bid Adapter

Module Type: Bidder Adapter

Maintainer: prebid@empower.net

# Description

Module that connects to Empower's demand sources

This adapter requires setup and approval from Empower.net.
Please reach out to your account team or info@empower.net for more information.

# Test Parameters
```javascript
    var adUnits = [
        {
            code: '/19968336/prebid_banner_example_1',
            mediaTypes: {
                banner: {
                    sizes: [[970, 250], [300, 250]],
                }
            },
            bids: [{
                bidder: 'empower',
                params: {
                    bidfloor: 0.50,
                    zone: 123456,
                    site: 'example'
                },
            }]
        }
    ];
```
