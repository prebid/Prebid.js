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
                        pid: 1,
                        tid: "demo",
                        bidfloor: 20
                    }
                }
            ]
        }
    ];
```

Where:

* pid - Publisher id
* tid - A tag id (should have low cardinality)
* bidfloor - Floor price
