# Overview

Module Name: OTM Bidder Adapter
Module Type: Bidder Adapter
Maintainer: ?

# Description

You can use this adapter to get a bid from otm-r.com.

About us : http://otm-r.com


# Test Parameters
```javascript
    var adUnits = [
        {
            code: 'div-otm-example',
            sizes: [[320, 480]],
            bids: [
                {
                    bidder: "otm",
                    params: {
                        tid: "99",
                        bidfloor: 20
                    }
                }
            ]
        }
    ];
```

Where:

* tid - A tag id (should have low cardinality)
* bidfloor - Floor price
