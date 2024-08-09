# Overview
```
Module Name: Vuukle Bid Adapter
Module Type: Bidder Adapter
Maintainer: support@vuukle.com
```

# Description
Module that connects to Vuukle's server for bids.
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
            bidder: 'vuukle',
            params: {}
        }]
    }];
```
