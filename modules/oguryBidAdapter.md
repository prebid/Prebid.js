# Overview

```
Module Name: Ogury Bidder Adapter
Module Type: Bidder Adapter
Maintainer: web.inventory@ogury.co
```

# Description

Module that connects to Ogury's SSP solution
Ogury bid adapter supports Banner media type.

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],  // a display size
                }
            },
            bids: [
                {
                    bidder: "ogury",
                    params: {
                        assetKey: 'OGY-CA41D116484F',
                        adUnitId: '2c4d61d0-90aa-0139-0cda-0242ac120004'
                        xMargin?: 20
                        yMargin?: 20
                        gravity?: 'TOP_LEFT' || 'TOP_RIGHT' || 'BOTTOM_LEFT' || 'BOTTOM_RIGHT' || 'BOTTOM_CENTER' || 'TOP_CENTER' || 'CENTER'
                    }
                }
            ]
        }
    ];
```