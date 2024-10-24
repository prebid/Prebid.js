# Overview

```
Module Name: Equativ Bidder Adapter (beta)
Module Type: Bidder Adapter
Maintainer: support@equativ.com
```

# Description

Connect to Equativ for bids.

The Equativ adapter requires setup and approval from the Equativ team. Please reach out to your technical account manager for more information.

# Test Parameters

## Web or In-app
```javascript
var adUnits = [
    {
        code: '/589236/banner_1',
        mediaTypes: {
            banner: {
                sizes: [[300, 250]]
            }
        },
        bids: [
            {
                bidder: 'equativ',
                params: {
                    networkId: 13,  // mandatory if no ortb2.(site or app).publisher.id set
                    siteId: 20743,  // optional
                    pageId: 89653,  // optional
                    formatId: 291,  // optional
                }
            }
        ]
    }
];
```