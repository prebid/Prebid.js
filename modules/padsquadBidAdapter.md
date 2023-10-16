# Overview

```
Module Name:  Padsquad Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   yeeldpadsquad@gmail.com
```

# Description

Connects to Padsquad exchange for bids.

Padsquad bid adapter supports Banner ads.

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
            bidder: 'padsquad',
            params: {
                unitId: 'test'
            }
        }]
    }
];
```
