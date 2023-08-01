# Overview

```
Module Name: redtram Bidder Adapter
Module Type: redtram Bidder Adapter
Maintainer: support@redtram.com
```

# Description

Module that connects to redtram demand sources

# Test Parameters
```
    var adUnits = [
        {
            code: 'div-prebid',
            mediaTypes:{
                banner: {
                    sizes: [[300, 250]],
                }
            },
            bids:[
                {
                    bidder: 'redtram',
                    params: {
                        placementId: '23611' //test, please replace after test 
                    }
                }
            ]
        },
    ];
```