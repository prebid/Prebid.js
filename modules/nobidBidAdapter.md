---
layout: bidder
title: Nobid
description: Prebid Nobid Bidder Adaptor
biddercode: nobid
hide: true
media_types: banner
gdpr_supported: true
---

# Overview

```
Module Name: Nobid Bidder Adapter
Module Type: Bidder Adapter
Maintainer: rob.dubois@nobid.io
```

# Description

Module that connects to Nobid demand sources

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],  // a display size
                }
            },
            bids: [
                {
                    bidder: "nobid",
                    params: {
                        siteId: <SITE_ID_PROVIDED_BY_YOUR_NOBID_ACCOUNT_MANAGER>
                    }
                }
            ]
        },{
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[320, 50]],   // a mobile size
                }
            },
            bids: [
                {
                    bidder: "nobid",
                    params: {
                        siteId: <SITE_ID_PROVIDED_BY_YOUR_NOBID_ACCOUNT_MANAGER>
                    }
                }
            ]
        }
    ];
```