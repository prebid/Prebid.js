# Overview

```
Module Name: MediaEyes Bidder Adapter
Module Type: MediaEyes Bidder Adapter
Maintainer: giathinh.ly@urekamedia.vn
```

# Description

Module that connects to MediaEyes Bidder System

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
                    bidder: 'mediaeyes',
                    params: {
                        itemId: '4d27f3cc8bbd5bd153045e' // Item for test
                    }
                }
            ]
        },
    ];
```
