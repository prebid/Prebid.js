# Overview

```
Module Name:  Automatad Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   tech@automatad.com
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
                siteId: 'someValue',                // required
                placementId: 'someValue'            // optional
            }
        }]
    }
];
```
