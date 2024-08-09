# Overview

```
Module Name: Mediasniper Bid Adapter
Module Type: Bidder Adapter
Maintainer: oleg@rtbtech.org
```

# Description

Connects to Mediasniper demand source to fetch bids.

# Test Parameters

```
var adUnits = [
{
    code: 'test',
    mediaTypes: {
        banner: {
            sizes: [[300, 250], [300, 600]],
        }
    },
    bids: [{
        bidder: 'mediasniper',
        params: {
            placementId: "123456"
        }
    }]
},
```
