# Overview

```
Module Name: Vistars Bid Adapter
Module Type: Bidder Adapter
Maintainer: info@vistarsagency.com
```

# Description
Connects to Vistars server for bids.
Module supports banner and video mediaType.

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
            bidder: 'vistars',
            params: {
                source: 'ssp1',
            }
        }]
    },
    {
        code: '/test/div',
        mediaTypes: {
            video: {
                playerSize: [[640, 360]]
            }
        },
        bids: [{
            bidder: 'vistars',
            params: {
                source: 'ssp1',
            }
        }]
    },];
```
