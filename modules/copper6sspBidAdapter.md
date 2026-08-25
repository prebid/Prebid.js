# Overview

**Module Name:** Copper6 Bidder Adapter

**Module Type:** Bidder Adapter

**Maintainer:** operations@copper6.com

# Description

Module that connects to Copper6's demand sources.

# Test Parameters

```js
var adUnits = [
    {
        code: 'test-ad',
        sizes: [[300, 250]],
        bids: [
            {
                bidder: 'copper6ssp',
                params: {
                    cId: '562524b21b1c1f08117667f9',
                    pId: '59ac17c192832d0016683fe3',
                    bidFloor: 0.0001,
                    ext: {
                        // custom params that were recomended to add by a partner
                    }
                }
            }
        ]
    }
];
```
