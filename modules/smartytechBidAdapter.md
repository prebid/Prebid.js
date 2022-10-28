# Overview

Module Name: SmartyTech Bidder Adapter

Module Type: Bidder Adapter

Maintainer: info@adpartner.pro

# Description

You can use this adapter to get a bid from smartytech.io.

About us : https://smartytech.io

# Test Parameters

```javascript
    var adUnits = [
    {
        code: 'div-smartytech-example',
        sizes: [[300, 250]],
        bids: [
            {
                bidder: "smartytechDSP",
                params: {
                    endpoint_id: 6698
                }
            }
        ]
    },
    {
        code: 'div-smartytech-example-2',
        sizes: [[300, 250]],
        bids: [
            {
                bidder: "smartytechDSP",
                params: {
                    endpoint_id: 7698
                }
            }
        ]
    }
];
```
