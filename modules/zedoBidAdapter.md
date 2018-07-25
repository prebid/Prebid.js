# Overview

Module Name: ZEDO Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebidsupport@zedo.com

# Description

Module that connects to ZEDO's demand sources.

For video integration, ZEDO returns content as vastXML and requires the publisher to define the cache url in config passed to Prebid for it to be valid in the auction

# Test Parameters
```
    var adUnits = [
        {
            code: 'banner-ad-div',
            sizes: [[300, 250], [728, 90]],
            bids: [
                {
                    bidder: 'zedo',
                    params: {
                        code: 2264004118
                        dimId: 9
                    }
                }
            ]
        }
    ];
```
