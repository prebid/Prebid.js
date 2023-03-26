# Overview

```
Module Name: FreePass Bidder Adapter
Module Type: Bidder Adapter
Maintainer: dev@freepass.jp
```

# Description

Connects to FreePass service for bids. Only BANNER is currently supported. Please contact FreePass for proper setup.

# Test Parameters
```
    let adUnits = [
        {
            code: 'ad-banner-1', // ad slot HTML element ID
            mediaTypes: {
                banner: {
                    sizes: [[1024, 1024]]
                }
            },
            bids: [{
                bidder: 'freepass'
            }]
        }
    ];
```

