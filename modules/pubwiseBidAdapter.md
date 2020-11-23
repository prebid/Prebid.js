# Overview

```
Module Name:  PubWise Bid Adapter
Module Type:  Bidder Adapter
Maintainer: info@pubwise.io
```

# Description

Connects to PubWise exchange for bids.

# Sample Banner Ad Unit: For Publishers

With isTest parameter the system will respond in whatever dimensions provided.

## Banner

```
var adUnits = [
    {
        code: "banner-div",
        mediaTypes: {
        banner: {
            sizes: [[300, 250]]
        }
        },
        bids: [{
            bidder: 'pubwise',
            params: {
                siteId: "xxxxxx",
                spotId: "12345678",
                isTest: true
            }
        }]
    }
]
```
 ## Native
```
var adUnits = [
    {
        code: 'native-div',
        sizes: [[1, 1]],
        mediaTypes: {
        native: {
            title: {
            required: true
            },
            body: {
            required: true
            },
            image: {
            required: true
            },
            sponsoredBy: {
            required: true
            },
            icon: {
            required: false
            }
        }
        },
        bids: [{
            bidder: 'pubwise',
            params: {
                siteId: "xxxxxx",
                spotId: "N12345678",
                isTest: true
            }
        }]
    }
]

```

