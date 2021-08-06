# Overview

**Module Name** : BeOp Bidder Adapter  
**Module Type** : Bidder Adapter  
**Maintainer** : tech@beop.io

# Description

Module that connects to BeOp's demand sources

# Test Parameters
```
    var adUnits = [
        {
            code: 'in-article',
            mediaTypes: {
                banner: {
                    sizes: [[1,1]], 
                }
            },
            bids: [
                {
                    bidder: "beop",
                    params: {
                        accountId: '5a8af500c9e77c00017e4cad',
                        currency: 'EUR'
                    }
                }
            ]
        }
    ];
```

