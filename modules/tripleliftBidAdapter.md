# Overview

```
Module Name:  Triplelift Bid Adapter
Module Type:  Bidder Adapter
Maintainer: bzellman@triplelift.com
```

# Description

Connects to Triplelift Exchange for bids.

Triplelift bid adapter supports Banner format only. We are a native SSP that takes components and renders them to fit the look and feel of the publisher's page.
We do not support

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
    },{
        bidder: 'appnexus',
        params: {
           placementId: '10433394'
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
    },{
        bidder: 'appnexus',
        params: {
           placementId: '10433394'
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
    },{
        bidder: 'appnexus',
        params: {
           placementId: '10433394'
        }
    }]
}];
```
