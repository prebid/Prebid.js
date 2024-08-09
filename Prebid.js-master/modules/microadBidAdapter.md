# Overview

Module Name: MicroAd SSP Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@microad.co.jp

# Description

Module that connects to MicroAd SSP demand sources.

# Test Parameters

```javascript
    var adUnits = [
        code: '209e56872ae8b0442a60477ae0c58be9',
        mediaTypes: {
            banner: {
                sizes: [[200, 200]]
            }
        },
        bids: [{
            bidder: 'microad',
            params: {
                spot: '209e56872ae8b0442a60477ae0c58be9'
            }
        }]
    ];
```
