# Overview

```
Module Name:  NextRoll Bid Adapter
Module Type:  Bidder Adapter
Maintainer: prebid@nextroll.com
```

# Description

Module that connects to NextRoll's bidders.
The NextRoll bid adapter supports banner and native format.

# Test Parameters

## Banner Example
``` javascript
var adUnits = [
    {
        code: 'div-1',
        mediatypes: {
            banner: {sizes: [[300, 250], [160, 600]]}
        },
        bids: [{
            bidder: 'nextroll',
            params: {
                bidfloor: 1,
                zoneId: "13144370",
                publisherId: "publisherid",
                sellerId: "sellerid"
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
                zoneId: "13144370",
                publisherId: "publisherid",
                sellerId: "sellerid"
            }
        }]
    }
]
```

## Native Example
```javascript
var adUnits = [
    {
        code: 'div-1',
        mediaTypes: {
            native: {
                title: { required: true, len: 80 },
                image: { required: true, sizes: [728, 90] },
                sponsoredBy: { required: false, len: 20 }
            }
        },
        bids: [{
            bidder: 'nextroll',
            params: {
                bidfloor: 1,
                zoneId: "13144370",
                publisherId: "publisherId",
                sellerId: "sellerId",
            }
        }]
    }
];
```