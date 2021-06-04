# Overview

```
Module Name: Gnet Bidder Adapter
Module Type: Bidder Adapter
Maintainer: roberto.wu@grumft.com
```

# Description

Module that connects to Example's demand sources

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
                        websiteId: '4',
                        externalId: '4d52cccf30309282256012cf30309282'
                    }
                }
            ]
        }
    ];