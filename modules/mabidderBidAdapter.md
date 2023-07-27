#Overview

```
Module Name: mabidder Bid Adapter
Module Type: Bidder Adapter
Maintainer: lmprebidadapter@loblaw.ca
```

# Description

Module that connects to MediaAisle demand sources

# Test Parameters
```
var adUnits = [
    {
        code: 'test_banner',
        mediaTypes: {
            banner: {
                sizes: [300, 250]
            }
        },
        bids: [{
            bidder: 'mabidder',
            params: {
                ppid: 'test'
            }
        }],
    }
];
```
