# Overview

```
Module Name:  Automatad Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   ''
```

# Description

Connects to automatad exchange for bids.

automatad bid adapter supports Banner ads.

# Test Parameters
```
var adUnits = [
    {
        code: 'banner-ad-div',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [300,600]]
            }
        },
        bids: [{
            bidder: 'automatad',
            params: {
                siteId: 'someValue',
                placementId: 'someValue'
            }
        }]
    }
];
```
