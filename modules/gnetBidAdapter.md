# Overview

```
Module Name: Gnet Bidder Adapter
Module Type: Bidder Adapter
Maintainer: roberto.wu@grumft.com
```

# Description

Connect to Gnet Project exchange for bids.

# Test Parameters
```
    var adUnits = [
        {
            code: '/150790500/4_ZONA_IAB_300x250_5',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],
                }
            },
            bids: [
                {
                    bidder: 'gnet',
                    params: {
                        websiteId: '4'
                    }
                }
            ]
        }
    ];