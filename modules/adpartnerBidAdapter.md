# Overview

Module Name: AdPartner Bidder Adapter

Module Type: Bidder Adapter

Maintainer: info@adpartner.pro

# Description

You can use this adapter to get a bid from adpartner.pro.

About us : https://adpartner.pro


# Test Parameters
```javascript
    var adUnits = [
        {
            code: 'div-adpartner-example',
            sizes: [[300, 250]],
            bids: [
                {
                    bidder: "adpartner",
                    params: {
                        unitId: 6698
                    }
                }
            ]
        },
        {
            code: 'div-adpartner-example-2',
            sizes: [[300, 250]],
            bids: [
                {
                    bidder: "adpartner",
                    params: {
                        partnerId: 6698
                    }
                }
            ]
        }
    ];
```
