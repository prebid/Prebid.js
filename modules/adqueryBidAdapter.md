# Overview

Module Name: Adquery Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@adquery.com

# Description

Module that connects to Adquery's demand sources.

# Test Parameters
```
    var adUnits = [
        {
            code: 'banner-adquery-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],
                }
            },
            bids: [
                {
                    bidder: 'adquery',
                    params: {
                        placementId: '6d93f2a0e5f0fe2cc3a6e9e3ade964b43b07f897',
                        type: 'banner300x250'
                    }
                }
            ]
        }
    ];
```
