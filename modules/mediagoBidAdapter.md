# Overview

```
Module Name: MediaGo Bidder Adapter
Module Type: Bidder Adapter
Maintainer: fangsimin@baidu.com
```

# Description

Module that connects to MediaGo's demand sources

# Test Parameters

```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],
                }
            },
            bids: [
                {
                    bidder: "mediago",
                    params: {
                        token: ''  // required, send email to ext_mediago_am@baidu.com to get the corresponding token
                    }
                }
            ]
        }
    ];
```
