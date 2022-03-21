# Overview

```
Module Name: AdHash Bidder Adapter
Module Type: Bidder Adapter
Maintainer: damyan@adhash.org
```

# Description

Here is what you need for Prebid integration with AdHash:
1. Register with AdHash.
2. Once registered and approved, you will receive a Publisher ID and Platform URL.
3. Use the Publisher ID and Platform URL as parameters in params.

Please note that a number of AdHash functionalities are not supported in the Prebid.js integration:
* Cookie-less frequency and recency capping;
* Audience segments;
* Price floors and passback tags, as they are not needed in the Prebid.js setup;
* Reservation for direct deals only, as bids are evaluated based on their price.

# Test Parameters
```
    var adUnits = [
        {
            code: '/19968336/header-bid-tag-1',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]]
                }
            },
            bids: [
                {
                    bidder: 'adhash',
                    params: {
                        publisherId: '0x1234567890123456789012345678901234567890',
                        platformURL: 'https://adhash.org/p/example/'
                    }
                }
            ]
        }
    ];
```