# Overview

Module Name: AOL Bid Adapter

Module Type: AOL Adapter

Maintainer: hb-fe-tech@oath.com

# Description

Module that connects to AOL's demand sources

# Test Parameters
```javascript
    var adUnits = [
        {
            code: 'test-ad',
            sizes: [[300, 250]],
            bids: [
                {
                    bidder: 'onedisplay',
                    params: {
                        placement: '3611253',
                        network: '9599.1',
                        keyValues: {
                            test: 'key'
                        }
                    }
                }
            ]
        },
        {
            code: 'test-mobile-ad',
            sizes: [[300, 250]],
            bids: [
                {
                    bidder: 'onemobile',
                    params: {
                        dcn: '2c9d2b50015a5aa95b70a9b0b5b10012',
                        pos: 'header'
                    }
                }
            ]
        }
    ];
```
