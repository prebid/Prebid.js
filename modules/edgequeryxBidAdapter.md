# Overview

```
Module Name: Edge Query X Bidder Adapter
Module Type: Bidder Adapter
Maintainer: contact@edgequery.com
```

# Description

Connect to Edge Query X for bids.

The Edge Query X adapter requires setup and approval from the Edge Query team.
Please reach out to your Technical account manager for more information.

# Test Parameters

## Web
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[1, 1]]
                }
            },
            bids: [
                {
                    bidder: "edgequeryx",
                    params: {
                        accountId: "test",
                        widgetId: "test"
                    }
                }
            ]
        }
    ];
```