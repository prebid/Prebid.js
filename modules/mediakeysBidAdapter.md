# Overview

```
Module Name: Mediakeys Bid Adapter
Module Type: Bidder Adapter
Maintainer: prebidjs@mediakeys.com
```

# Description

Connects to Mediakeys demand source to fetch bids.

# Test Parameters

## Banner only Ad Unit

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
        bidder: 'mediakeys',
        params: {} // no params required.
    }]
},
```
