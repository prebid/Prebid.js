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
            code: 'test-banner-adunit-code',
            sizes: [[300, 250], [320, 50]],
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
            code: 'test-native-adunit-code',
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
                    sponsoredBy: {
                        required: true
                    },
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
