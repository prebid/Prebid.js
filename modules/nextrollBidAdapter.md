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
var adunits = [
    {
        code: 'div-1',
        mediatypes: {
            banner: {sizes: [[300, 250], [160, 600]]}
        },
        bids: [{
            bidder: 'nextroll',
            params: {
                bidfloor: 1,
                zoneid: 13144370,
                publisherid: "publisherid",
            }
        }]
    },
    {
        code: 'div-2',
        mediatypes: {
            banner: {
                sizes: [[728, 90], [970, 250]]
            }
        },
        bids: [{
            bidder: 'nextroll',
            params: {
                bidfloor: 2.3,
                zoneid: 13144370,
                publisherid: "publisherid",
            }
        }]
    }
]
```