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
            sizes: [[300, 300]],
            bids: [
                {
                    bidder: "performax",
                    params: {
                        slotId: 28   // required
                    }
                }
            ]
        }
    ];
```

Where:
* slotId - id of slot in PX system
