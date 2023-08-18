# Overview

```
Module Name: Colossus SSP Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@colossusmediallc.com
```

# Description

Module that connects to Colossus SSP demand sources

# Test Parameters
```
    var adUnits = [{
        code: 'placementid_0',
        mediaTypes: {
            banner: {
                sizes: [[300, 250], [300,600]]
            }
        },
        bids: [{
            bidder: 'colossusssp',
            params: {
                placement_id: 0
            }
        }]
    }, {
        code: 'placementid_1',
        mediaTypes: {
            video: {
                playerSize: [ [640, 480] ],
                context: 'instream',
                minduration: 5,
                maxduration: 60,
            }
        },
        bids: [{
            bidder: 'colossusssp',
            params: {
                group_id: 0
            }
        }]
    }, {
        code: 'placementid_2',
        mediaTypes: {
            native: {
                title: {
                    required: true
                },
                body: {
                    required: true
                },
                icon: {
                    required: true,
                    size: [64, 64]
                }
            }
        },
        bids: [{
            bidder: 'colossusssp',
            params: {
                placement_id: 0,
            }
        }]
    }];
```
