# Overview

Module Name: MEDIAIMPACT Bidder Adapter

Module Type: Bidder Adapter

Maintainer: Info@mediaimpact.com.ua

# Description

You can use this adapter to get a bid from mediaimpact.com.ua.

About us : https://mediaimpact.com.ua


# Test Parameters
```javascript
    var adUnits = [
        {
            code: 'div-ad-example',
            sizes: [[300, 250]],
            bids: [
                {
                    bidder: "mediaimpact",
                    params: {
                        unitId: 6698
                    }
                }
            ]
        },
        {
            code: 'div-ad-example-2',
            sizes: [[300, 250]],
            bids: [
                {
                    bidder: "mediaimpact",
                    params: {
                        partnerId: 6698,
                        sizes: [[300, 600]],
                    }
                }
            ]
        }
    ];
```
