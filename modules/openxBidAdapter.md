# Overview

```
Module Name: OpenX Bidder Adapter
Module Type: Bidder Adapter
Maintainer: team-openx@openx.com
```

# Description

Module that connects to OpenX's demand sources

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            sizes: [[728, 90]],  // a display size
            mediaTypes: {'banner': {}},
            bids: [
                {
                    bidder: 'openx',
                    params: {
                        unit: '539439964',
                        delDomain: 'se-demo-d.openx.net'
                    }
                }
            ]
        },
        {
            code: 'video1',
            sizes: [[640,480]],
            mediaTypes: {'video': {}},
            bids: [
              {
                bidder: 'openx',
                params: {
                  unit: '539131525',
                  delDomain: 'zdo.com',
                  video: {
                     url: 'abc.com'
                  }
                }
              }
            ]
        }
    ];
```
