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

## Params



## Banner
```
var adUnits = [
    {
        code: "div-gpt-ad-1460505748561-0",
        mediaTypes: {
        banner: {
            sizes: [[300, 250]]
        }
        },
        bids: [{
            bidder: 'pubwise',
            params: {
                siteId: "xxxxxx",
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
        code: 'div-gpt-ad-1460505748561-1',
        sizes: [[1, 1]],
        mediaTypes: {
            native: {
                title: {
                    required: true,
                    len: 80
                },
                body: {
                    required: true
                },
                image: {
                    required: true,
                    sizes: [150, 50]
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
                isTest: true,
            },
        }]
    }
]
```

