# Overview

```
Module Name: Zeta Bidder Adapter
Module Type: Bidder Adapter
Maintainer: DL-ZetaDSP-Supply-Engineering@zetaglobal.com
```

# Description

Module that connects to Zeta's demand sources

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],  // a display size
                }
            },
            bids: [
                {
                    bidder: 'Zeta Global',
                    bidId: 12345
                    params: {
                        placement: 12345
                        user: {
                            uid: 12345,
                            buyeruid: 12345
                        },
                        ip: 0.0.0.0
                        test: 1
                    }
                }
            ]
        }
    ];
```
