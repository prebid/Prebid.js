# Overview

```
Module Name: topRTB Bidder Adapter
Module Type: Bidder Adapter
Maintainer: karthikeyan.d@djaxtech.com
```

# Description

topRTB Bidder Adapter for Prebid.js. 
Only Banner & video format is supported.

# Test Parameters
```
    var adUnits = [
       {
           code: 'test-div-0',
           sizes: [[728, 90]],  // a display size
           bids: [
               {
                    bidder: 'topRTB',
                    params: {
                        adUnitId: 'c5c06f77430c4c33814a0577cb4cc978'
                    }
               }
           ]
       }
    ];
```
