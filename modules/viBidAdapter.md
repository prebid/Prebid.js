# Overview

```
Module Name: VI Bid Adapter
Module Type: Bidder Adapter
Maintainer: support@vi.ai
```

# Description

Video Intelligence AG adapter integration to the Prebid library.
Connects to VI demand source.

# Test Parameters

```
var adUnits = [{
    code: 'div-0',
    sizes: [[320, 480], [480, 320]],
    bids: [{
        bidder: 'vi',
        params: {
            pubId: 'sb_test',
            lang: 'en-US',
            cat: 'IAB1'
        }
    }]
}, {
    code: 'div-1',
    sizes: [[320, 480]],
    bids: [{
        bidder: 'vi',
        params: {
            pubId: 'sb_test',
            lang: 'en-US',
            cat: 'IAB25-3'
        }
    }]
}];
```
