# Overview

```
Module Name: MediaGo Technology LLC Bidder Adapter
Module Type: Bidder Adapter
Maintainer: fangsimin@baidu.com
```

# Description

Module that connects to MediaGo Technology LLC's demand sources

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
                    bidder: "mgtechnology",
                    params: {
                        token: ''  // required, send email to ext_mediago_am@baidu.com to get the corresponding token
                    }
                }
            ]
        }
    ];
```
