# Overview

```
Module Name: MediaGo Technology LLC Bidder Adapter
Module Type: Bidder Adapter
Maintainer: fangsimin@baidu.com
Alias of: mediagoBidAdapter
```

# Description

This adapter is an alias of the MediaGo Bidder Adapter (`mediagoBidAdapter`), connecting to MediaGo Technology LLC's demand sources via a separate endpoint and GVL ID (1575).

To use this adapter, include `mediagoBidAdapter` in your build. The `mgtechnology` bidder code is automatically registered as an alias.

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
