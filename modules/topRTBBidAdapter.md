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
           sizes: [[300, 250]],  // a display size
           bids: [
               {
                    bidder: 'topRTB',
                    params: {
                        adUnitId: cd95dffec6b645afbc4e5aa9f68f2ff3
                    }
               }
           ]
       }
    ];
```
