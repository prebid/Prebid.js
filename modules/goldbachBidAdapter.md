# Goldbach Bidder Adapter

## Overview

```text
Module Name: Goldbach Bidder Adapter
Module Type: Bidder Adapter
Maintainer: benjamin.brachmann@goldbach.com
```

## Description

Module that connects to Goldbach SSP demand sources.

```shell
gulp build --modules=goldbachBidAdapter,userId,pubProvidedIdSystem
```

## Test Parameters

```javascript
    var adUnits = [
        {
            code: 'au-1',
                mediaTypes: {
                    video: {
                        sizes: [[640, 480]],
                        maxduration: 30,
                    }
                },
            bids: [
                {
                    bidder: 'goldbach',
                    params: {
                        publisherId: 'goldbach_debug',
                        slotId: '/1235/example.com/video/video/example'
                    }
                }
            ]
        },
        {
            code: 'au-2',
            sizes: [[1, 1]],
            mediaTypes: {
                native: {
                    title: {
                        required: true,
                        len: 50
                    },
                    image: {
                        required: true,
                        sizes: [300, 157]
                    },
                    icon: {
                        required: true,
                        sizes: [30, 30]
                    }
                }
            },
            bids: [
                {
                    bidder: 'goldbach',
                    params: {
                        publisherId: 'goldbach_debug',
                        slotId: '/1235/example.com/inside-full-test-native/example'
                    }
                }
            ]
        }, 
        {
            code: 'au-3',
            sizes: [[300, 250]],
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],
                }
            },
            bids: [
                {
                    bidder: 'goldbach',
                    params: {
                        publisherId: 'goldbach_debug',
                        slotId: '/1235/example.com/inside-full-test-banner/example'
                    }
                }
            ]
        }, 
    ];
```
