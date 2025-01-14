# Overview

```
Module Name: CondorX's Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@condorx.io
```

# Description

Module that connects to CondorX bidder to fetch bids.

# Test Parameters
```
    var adUnits = [{
            code: 'condorx-container-id',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],  
                }
            },
            bids: [{
                bidder: "condorx",
                params: {
                    widget: 'widget id by CondorX',
                    website: 'website id by CondorX',
                    url:'current url'
                }
            }]
        },
        {
            code: 'condorx-container-id',
            mediaTypes: {
                native: {
                    image: {
                        required: true,
                        sizes: [236, 202]
                    },
                    title: {
                        required: true,
                        len: 100
                    },
                    sponsoredBy: {
                        required: true
                    },
                    clickUrl: {
                        required: true
                    },
                    body: {
                        required: true
                    }
                }
            },
            bids: [{
                bidder: "condorx",
                params: {
                    widget: 'widget id by CondorX',
                    website: 'website id by CondorX',
                    url:'current url'
                }
            }]
        }    
    }];
```
