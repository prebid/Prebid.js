# Overview

```
Module Name: Programmatica Bid Adapter
Module Type: Bidder Adapter
Maintainer: tech@programmatica.com
```

# Description
Connects to Programmatica server for bids.
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
            bidder: 'programmatica',
            params: {
                siteId: 'cga9l34ipgja79esubrg',
                placementId: 'cgim20sipgj0vj1cb510'
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
            bidder: 'programmatica',
            params: {
                siteId: 'cga9l34ipgja79esubrg',
                placementId: 'cioghpcipgj8r721e9ag'
            }
        }]
    },];
```
