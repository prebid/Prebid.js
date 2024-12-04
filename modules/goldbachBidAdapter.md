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
            code: '/1235/example.com/video/video/example',
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
                    }
                }
            ]
        },
        {
            code: '/1235/example.com/inside-full-test-native/example',
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
                    }
                }
            ]
        }, 
        {
            code: '/1235/example.com/inside-full-test-banner/example',
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
                    }
                }
            ]
        }, 
    ];
```
