# Overview

```
Module Name: Mobsmart Bidder Adapter
Module Type: Bidder Adapter
Maintainer: adx@kpis.jp
```

# Description

Module that connects to Mobsmart demand sources to fetch bids.

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
                    bidder: "mobsmart",
                    params: {
                        floorPrice: 100,
                        currency: 'JPY'
                    }
                }
            ]
        },{
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[320, 50]],   // a mobile size
                }
            },
            bids: [
                {
                    bidder: "mobsmart",
                    params: {
                        floorPrice: 90,
                        currency: 'JPY'
                    }
                }
            ]
        }
    ];
```
