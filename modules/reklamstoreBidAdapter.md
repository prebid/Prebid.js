# Overview

Module Name: ReklamStore Bidder Adapter
Module Type: Bidder Adapter
Maintainer: it@reklamstore.com

# Description

Module that connects to ReklamStore's demand sources.

ReklamStore supports display. 


# Test Parameters
# display
```

    var adUnits = [
        {
            code: 'banner-ad-div',
            sizes: [[300, 250]],
            bids: [
                {
                    bidder: 'reklamstore',
                    params: {
                        regionId:532211
                    }
                }
            ]
        }
    ];
```