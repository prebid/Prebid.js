# Overview
```
Module Name: NextMillenium Bid Adapter
Module Type: Bidder Adapter
Maintainer: mikhail.ivanchenko@iageengineering.net
```

# Description
Module that connects to NextMillenium's server for bids.
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
            bidder: 'nextMillenium',
            params: {
                placement_id: -1
            }
        }]
    }];
```