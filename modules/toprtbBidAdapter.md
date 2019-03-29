# Overview

```
Module Name: Toprtb Bidder Adapter
Module Type: Bidder Adapter
Maintainer: developers@toprtb.com
```

# Description

toprtb Bidder Adapter for Prebid.js. 
Only Banner format is supported.

# Test Parameters
```
    var adUnits = [
       {
           code: 'test-div-0',
           sizes: [[300, 250]],  // a display size
           bids: [
               {
                    bidder: 'toprtb',
                    params: {
                        adUnitId: 1b92aa181561481b8a36fdebb89bae29
                    }
               }
           ]
       }
    ];
```
