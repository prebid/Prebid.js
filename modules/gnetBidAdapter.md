# Overview

```
Module Name: Gnet RTB Bidder Adapter
Module Type: Bidder Adapter
Maintainer: bruno.bonanho@grumft.com
```

# Description

Connect to Gnet RTB exchange for bids.

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
                        websiteId: '1', adunitId: '1'
                    }
                }
            ]
        }
    ];