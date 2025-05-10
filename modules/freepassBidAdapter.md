# Overview

```
Module Name: FreePass Bidder Adapter
Module Type: Bidder Adapter
Maintainer: fp-hbidding@freebit.net
```

# Description

Connects to FreePass service for bids. Only BANNER is currently supported. 

This BidAdapter requires the FreePass IdSystem to be configured. Please contact FreePass for proper setup.

# Test Parameters
```javascript
    let adUnits = [
        {
            code: 'ad-banner-1', // ad slot HTML element ID
            mediaTypes: {
                banner: {
                    sizes: [[1024, 1024]]
                }
            },
            bids: [{
                bidder: 'freepass',
                params: {
                    publisherId: '12345'
                }
            }]
        }
    ];
```

