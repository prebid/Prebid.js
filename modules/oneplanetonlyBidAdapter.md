# Overview

```
Module Name: OnePlanetOnly Bidder Adapter
Module Type: Bidder Adapter
Maintainer: vitaly@oneplanetonly.com
```

# Description

Module that connects to OnePlanetOnly's demand sources

# Test Parameters
```
    var adUnits = [
        {
            code: 'desktop-banner-ad-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250], [300, 600]],
                }
            },
            bids: [
                {
                    bidder: 'oneplanetonly',
                    params: {
                        siteId: '5',
                        adUnitId: '5-4587544'
                    }
                }
            ]
        },{
            code: 'mobile-banner-ad-div',
            mediaTypes: {
                banner: {
                    sizes: [[320, 50], [320, 100]],
                }
            },
            bids: [
                {
                    bidder: "oneplanetonly",
                    params: {
                        siteId: '5',
                        adUnitId: '5-81037880'
                    }
                }
            ]
        }
    ];
```