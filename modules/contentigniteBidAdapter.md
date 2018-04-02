# Overview

```
Module Name: Content Ignite Bidder Adapter
Module Type: Bidder Adapter
Maintainer: jamie@contentignite.com
```

# Description

Module that connects to Content Ignites bidder application.

# Test Parameters

```
    var adUnits = [{
        code: 'display-div',
        sizes: [[728, 90]],  // a display size
        bids: [{
            bidder: "contentignite",
            params: {
                accountID: '168237',
                zoneID: '299680',
                keyword: 'business', //optional
                minCPM: '0.10', //optional
                maxCPM: '1.00' //optional
            }
        }]
    }];
```
