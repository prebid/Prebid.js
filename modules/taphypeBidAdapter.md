# Overview

Module Name: TapHype Bidder Adapter
Module Type: Bidder Adapter
Maintainer: admin@taphype.com

# Description

You can use this adapter to get a bid from taphype.com.


# Test Parameters
```javascript
    var adUnits = [
        {
            code: 'div-taphype-example',
            sizes: [[300, 250]],
            bids: [
                {
                    bidder: "taphype",
                    params: {
                        placementId: 12345
                    }
                }
            ]
        }
    ];
```

Where:

* placementId - TapHype Placement ID
