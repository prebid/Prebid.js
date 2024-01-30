# Overview

```
Module Name: zMaticoo Bidder Adapter
Module Type: Bidder Adapter
Maintainer: adam.li@eclicktech.com.cn
```

# Description

zMaticoo Bidder Adapter for Prebid.js.

# Test Parameters

```
        var adUnits = [
            {
                mediaTypes: {
                    banner: {
                        sizes: [[320, 50]],  // a display size
                    }
                },
                bids: [
                    {
                        bidder: 'zmaticoo',
                        bidId: '12345',
                        params: {
                            user: {
                                uid: '12345',
                                buyeruid: '12345'
                            },
                            device: {
                                ip: '111.222.33.44',
                                geo: {
                                    country: 'USA'
                                }
                            },
                            pubId: 'prebid-fgh',
                            test: 1
                        }
                    }
                ]
            }
        ];
```
