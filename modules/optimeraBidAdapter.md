# Overview

```
Module Name: Optimera Bidder Adapter
Module Type: Bidder Adapter
Maintainer: kcandiotti@optimera.nyc
```

# Description

Module that adds ad placement visibility scores for DFP.

# Test Parameters
```
    var adUnits = [{
                code: 'div-1',
                sizes: [[300, 250], [300,600]],
                bids: [
                    {
                        bidder: 'optimera',
                        params: {
                              clientID: '0'
                        }
                    }]
            },{
                code: 'div-0',
                sizes: [[728, 90]],
                bids: [
                    {
                        bidder: 'optimera',
                        params: {
                              clientID: '0'
                        }
                    }]
            }];
```
