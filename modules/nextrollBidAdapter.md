# Overview

```
Module Name:  NextRoll Bid Adapter
Module Type:  Bidder Adapter
Maintainer: <mantainer email>
```

# Description

Module that connects to NextRoll's bidders.
The NextRoll bid adapter supports Banner format only.

# Test Parameters
``` javascript
var adUnits = [
    {
        code: 'div-1',
        mediaTypes: {
            banner: {sizes: [[300, 250], [300, 600]]}
        },
        bids: [{
            bidder: 'nextroll',
            params: {
                bidfloor: 1,
                zoneId: 13144370,
                publisherId: "publisherId",
            }
        }]
    },
    {
        code: 'div-2',
        mediaTypes: {
            banner: {
                sizes: [[728, 90], [970, 250]]
            }
        },
        bids: [{
            bidder: 'nextroll',
            params: {
                bidfloor: 2,
                zoneId: 13144370,
                publisherId: "publisherId",
            }
        }]
    }
];
```