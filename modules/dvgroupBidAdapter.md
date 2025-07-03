# Overview

```
Module Name: DvGroup Bid Adapter
Module Type: Bidder Adapter
Maintainer: info@dvgroup.com
```

# Description
Connects to DvGroup server for bids.
Module supportвs banner and video mediaType.

# Test Parameters

```
    var adUnits = [{
        code: '/test/div',
        mediaTypes: {
            banner: {
                sizes: [[300, 250]]
            }
        },
        bids: [{
            bidder: 'dvgroup',
            params: {
                sspId: 'prebidssp',               
            }
        }]
    }];
```
