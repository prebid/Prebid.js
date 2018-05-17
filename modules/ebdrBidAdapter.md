# Overview

**Module Name**: Ebdr Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: tech@engagebdr.com

# Description

Module that connects to Ebdr demand source to fetch bids.

# Test Parameters
```
    var adUnits = [{
        code: 'div-gpt-ad-1460505748561-0',
        sizes: [[300, 250], [300,600]],
        bids: [{
            bidder: 'ebdr',
            params: {
               zoneid: '99999',
               bidfloor: '1.00',
               IDFA:'xxx-xxx',
               ADID:'xxx-xxx',
               latitude:'34.089811',
               longitude:'-118.392805'
            }
        }]
    },{
        code: 'div-gpt-ad-1460505748561-1',
        sizes: [[728, 90], [970, 90]],
        bids: [{
            bidder: 'ebdr',
            params: {
               zoneid: '99999',
               bidfloor: '1.00',
               IDFA:'xxx-xxx',
               ADID:'xxx-xxx',
               latitude:'34.089811',
               longitude:'-118.392805'
            }
        }]
    }
    ];
```