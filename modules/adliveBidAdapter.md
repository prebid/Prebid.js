# Overview
```
Module Name: Adlive Bid Adapter
Module Type: Bidder Adapter
Maintainer: traffic@adlive.io
```

# Description
Module that connects to Adlive's server for bids.
Currently module supports only banner mediaType.

# Test Parameters
```
    var adUnits = [{
        code: '/test/div',
        mediaTypes: {
            banner: {
                sizes: [[300, 250]]
            }
        },
        bids: [{
            bidder: 'adlive',
            params: {
                hashes: ['623c02093e249228cb459c4118d25cdbee3bd17b']
            }
        }]
    }];
```