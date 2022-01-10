# Overview

```
Module Name: Zeta Ssp Bidder Adapter
Module Type: Bidder Adapter
Maintainer: miakovlev@zetaglobal.com
```

# Description

Module that connects to Zeta's SSP

# Test Parameters
```
        var adUnits = [
            {
                mediaTypes: {
                    banner: {
                        sizes: [[300, 250]],  // a display size
                    }
                },
                bids: [
                    {
                        bidder: 'zeta_global_ssp',
                        bidId: 12345,
                        params: {
                            placement: 12345,
                            user: {
                                uid: 12345,
                                buyeruid: 12345
                            },
                            tags: {
                                someTag: 123,
                                sid: 'publisherId'
                            },
                            test: 1
                        }
                    }
                ]
            }
        ];
```
