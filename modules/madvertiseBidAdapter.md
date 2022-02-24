# Overview

```
Module Name:  Madvertise Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   support@madvertise.com
```

# Description

Connect to Madvertise's exchange for bids.

The Madvertise adapter requires setup and approval from the
Madvertise team. Please reach out to your account team or
support@madvertise.com for more information.

# Test Parameters
```
    var adUnits = [
    {
        code: 'test-div',
        mediaTypes: {
            banner: {
                sizes: [
                    [320, 50]
                ]
            }
        },
        bids: [
            {
                bidder: "madvertise",
                params: {
                    zoneId: "/4543756/prebidadaptor/madvertiseHB"
                }
            }
        ]
    }
    ];
```
