# Overview

```
Module Name: Adrino Bidder Adapter
Module Type: Bidder Adapter
Maintainer: dev@adrino.pl
```

# Description

Module connects to Adrino bidder to fetch bids. Only native format is supported.

# Test Parameters

```
pbjs.setConfig({
    adrino: {
        host: 'https://custom-domain.adrino.io'
    }
});

var adUnits = [
    code: '/12345678/prebid_native_example_1',
    mediaTypes: {
        native: {
            image: {
                required: true,
                sizes: [[300, 210],[300,150],[140,100]]
            },
            title: {
                required: true
            },
            sponsoredBy: {
                required: false
            },
            body: {
                required: false
            },
            icon: {
                required: false
            }
        }
    },
    bids: [{
        bidder: 'adrino',
        params: {
            hash: 'abcdef123456'
        }
    }]
];
```
