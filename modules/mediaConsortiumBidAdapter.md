# Media Consortium Bid adapter

## Overview

```
- Module Name: MediaConsortium Bidder Adapter
- Module Type: MediaConsortium Bidder Adapter
- Maintainer: __SUPPORT_EMAIL__
```

## Description

Module that connects to Media Consortium demand sources and supports the following media types: `banner`

## Test Parameters
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
                    bidder: 'mediaConsortium',
                    params: {}
                }
            ]
        },
    ];
```
