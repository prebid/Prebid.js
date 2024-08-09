# Overview

```
Module Name: Nativo Bid Adapter
Module Type: Bidder Adapter
Maintainer: prebiddev@nativo.com
```

# Description

Module that connects to Nativo's demand sources

# Dev

gulp serve --modules=nativoBidAdapter

# Test Parameters

```
var adUnits = [
        {
            code: 'div-gpt-ad-1460505748561-0',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250], [300,600]],
                }
            },
            // Replace this object to test a new Adapter!
            bids: [{
                bidder: 'nativo',
                params: {
                    url: 'https://test-sites.internal.nativo.net/testing/prebid_adpater.html'
                }
            }]

        }
    ];

```
