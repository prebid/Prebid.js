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
                hashes: ['1e100887dd614b0909bf6c49ba7f69fdd1360437']
            }
        }]
    }];
```