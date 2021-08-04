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
                        accountId: '123456123456123456123456',
                        currency: 'EUR'
                    }
                }
            ]
        },{
            code: 'bellow-article',
            mediaTypes: {
                banner: {
                    sizes: [[1,1]], 
                }
            },
            bids: [
                {
                    bidder: "beop",
                    params: {
                        networkId: 'abcdefabcdefabcdefabcdef',
                        networkPartnerId: 'whatever',
                        currency: 'USD'
                    }
                }
            ]
        }
    ];
```

