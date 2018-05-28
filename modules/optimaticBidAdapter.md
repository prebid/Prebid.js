# Overview

```
Module Name: Optimatic Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@optimatic.com
```

# Description

Optimatic Bid Adapter Module connects to Optimatic Demand Sources for Video Ads

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            sizes: [[640,480]],  // a video size
            bids: [
                {
                    bidder: "optimatic",
                    params: {
                        placement: "2chy7Gc2eSQL",
                        bidfloor: 2.5
                    }
                }
            ]
        },
    ];
```
