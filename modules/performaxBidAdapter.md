# Overview

```
Module Name:  Performax Bid Adapter
Module Type:  Bidder Adapter
Maintainer: development@performax.cz
```

# Description

Connects to Performax exchange for bids.

Performax bid adapter supports Banner.


# Sample Banner Ad Unit: For Publishers

```javascript
    var adUnits = [
        {
            code: 'performax-div',
            mediaTypes: {
                banner: {sizes: [[300, 300]]},
            },
            bids: [
                {
                    bidder: "performax",
                    params: {
                        tagid: "sample"   // required
                    }
                }
            ]
        },
    ];
```

