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
                mediaTypes: {
                    banner: {
                        sizes: [[300, 250]],  // a display size
                    }
                },
                bids: [
                    {
                        bidder: 'zeta_global',
                        bidId: 12345,
                        params: {
                            placement: 12345,
                            user: {
                                uid: 12345,
                                buyeruid: 12345
                            },
                            device: {
                                ip: '111.222.33.44',
                                geo: {
                                    country: 'USA'
                                }
                            },
                            definerId: '44253',
                            test: 1
                        }
                    }
                ]
            }
        ];
```
