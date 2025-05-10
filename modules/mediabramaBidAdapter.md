# Overview

```
Module Name: MediaBrama Bidder Adapter
Module Type: MediaBrama Bidder Adapter
Maintainer: support@mediabrama.com
```

# Description

Module that connects to mediabrama demand sources

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
                    bidder: 'mediabrama',
                    params: {
                        placementId: '24428' //test, please replace after test 
                    }
                }
            ]
        },
    ];
```
