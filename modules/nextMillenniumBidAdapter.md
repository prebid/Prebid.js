# Overview
```
Module Name: NextMillennium Bid Adapter
Module Type: Bidder Adapter
Maintainer: mikhail.ivanchenko@iageengineering.net
```

# Description
Module that connects to NextMillennium's server for bids.
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
            bidder: 'nextMillennium',
            params: {
                placement_id: -1
            }
        }]
    }];
```