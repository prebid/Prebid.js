# Overview

```
Module Name: TrueReach Bidder Adapter
Module Type: Bidder Adapter
Maintainer: mm.github@momagic.com
```

# Description

Module that connects to TrueReach's demand sources

# Test Parameters
```
    var adUnits = [{
        code: 'test-banner',
        mediaTypes: {
             banner: {
                sizes: [[300, 250]]
             }
        },
        bids: [{
            bidder: 'truereach',
            params: {
                site_id: '0142010a-8400-1b01-72cb-a553b9000009',
                bidfloor: 0.1
            }
        }]
    }];
```

# Bid Parameters

`mediaTypes -> banner -> sizes` must be `defined`.

Also, the following parameters are `required` to be set-

| Name | Type | Description
| ---- | ---- | -----------
| `site_id` | String | TrueReach provided site ID 
| `bidfloor` | Number | Minimum price (CPM) in USD. Must be greater than 0.

# Additional Details
[TrueReach Ads](http://doc.truereach.co.in/docs/prebid/js-bidder-adapter.html)
