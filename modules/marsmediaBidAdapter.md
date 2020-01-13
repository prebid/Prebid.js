# Overview

```
Module Name: Mars Media Group (mars.media) Bidder Adapter
Module Type: Bidder Adapter
Maintainer: vladi@mars.media
```

# Description

Prebid adapter for Mars Media Group RTB. Requires approval and account setup.

# Test Parameters

## Web
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "marsmedia",
                       params: {
                           publisherID: 9999, 
                           floor: 0.11
                       }
                   }
               ]
           }
       ];
```