# Overview

```
Module Name:  RediAds Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   support@rediads.com
```

# Description

Connect to RediAds exchange for bids.

The RediAds adapter requires setup and approval.
Please reach out to support@rediads.com for more information.

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]]
                }
            },
            bids: [
                {
                    bidder: "rediads",
                    params: {
                        account_id: '123',
                        slot: '321', // optional
                        endpoint: 'https://bidding.rediads.com/openrtb2/auction' // optional, only to be used if rediads team provides one
                    }
                }
            ]
        }
    ];
```
