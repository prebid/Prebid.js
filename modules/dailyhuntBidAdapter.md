# Overview

```
Module Name:  Dailyhunt Bid Adapter
Module Type:  Bidder Adapter
Maintainer: Dailyhunt
```

# Description

Connects to dailyhunt for bids.

Dailyhunt bid adapter supports Banner and Native.

# Test Parameters
```
    var adUnits = [
        {
            code: '/83414793/prebid_test_display',
            sizes: [[300, 250], [320, 50]],
            mediaTypes: {
                banner : {
                    sizes: [[300, 250], [320, 50]],
                }
            },
            bids: [
                {
                    bidder: 'dailyhunt',
                    params: {
                      partnerId: 'pb-partnerId'
                    }
                }
            ]
        },
        {
            code: '/83414793/prebid_test_native',
            sizes: [[300, 250]],
            mediaTypes: {
                native: {
                    title: {
                        required: true
                    },
                    body: {
                        required: true
                    },
                    image: {
                        required: true
                    },
                    cta: {
                        required: true
                    }
                }
            },
            bids: [
                {
                    bidder: 'dailyhunt',
                    params: {
                      partnerId: 'pb-partnerId'
                    }
                }
            ]
        }
    ];
```

# CheckList
```
https://drive.google.com/open?id=1t4rmcyHl5OmRF3sYiqBi-VKEjzX6iN-A
```
