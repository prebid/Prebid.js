# Overview

```
Module Name:  Triplelift Bid Adapter
Module Type:  Bidder Adapter
Maintainer: csmith+s2s@triplelift.com
```

# Description

Connects to Triplelift Exchange for bids.
Triplelift bid adapter supports Banner format only.

# Test Parameters
```
var adUnits = [{
    code: 'banner-div',
    mediaTypes: {
        banner: {
            sizes: [[300, 600], [300, 250], [320, 90]],
        }
    },
    bids: [
    {
        bidder: 'triplelift',
        params: {
           inventoryCode: 'forbes_main',
           floor: 1.009
        }
    }]
}, {
    code: 'banner-div-2',
    mediaTypes: {
        banner: {
            sizes: [[300, 300]],
        }
    },
    bids: [
    {
        bidder: 'triplelift',
        params: {
           inventoryCode: 'foodgawker',
           floor: 0.00
        }
    }]
}, {
    code: 'banner-div-3',
    mediaTypes: {
        banner: {
            sizes: [[300, 600], [300, 250]],
        }
    },
    bids: [
    {
        bidder: 'triplelift',
        params: {
           inventoryCode: 'forbes_main',
           floor: 0
        }
    }]
}];
```
