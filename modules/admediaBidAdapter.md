# Overview

```
Module Name: Admedia Bidder Adapter
Module Type: Bidder Adapter
Maintainer: developers@admedia.com
```

# Description

Admedia Bidder Adapter for Prebid.js. 
Only Banner format is supported.

# Test Parameters
```
    var adUnits = [
       {
           code: 'test-div-0',
           sizes: [[300, 250]],  // a display size
           bids: [
               {
                    bidder: 'admedia',
                    params: {
                        aid: 86858
                    }
               }
           ]
       },
       {
           code: 'test-div-1',
           sizes: [[300, 50]],   // a mobile size
           bids: [
               {
                    bidder: 'admedia',
                    params: {
                        aid: 86858
                    }
               }
           ]
       }
    ];
```
