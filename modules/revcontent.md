# Overview

Module Name: Revcontent Adapater
Module Type: Bidder Adapter
Maintainer: dev@revcontent.com

# Description

Revcontent Adpater

# Test Parameters
```
    var adUnits = [
        code: '/19968336/prebid_native_example_1',
        sizes: [
            [360, 360]
        ],
        mediaTypes: {
            native: {
                image: {
                    required: false,
                    sizes: [100, 50]
                },
                title: {
                    required: false,
                    len: 140
                },
                sponsoredBy: {
                    required: false
                },
                clickUrl: {
                    required: false
                },
                body: {
                    required: false
                },
                icon: {
                    required: false,
                    sizes: [50, 50]
                }
            }
        },
        bids: [{
            bidder: 'revcontent',
            params: {
                apiKey: '8a33sdfsdfdsfsdfssss544f8sdfsdfsdfd3b1c',  // Required
                userId: 69565,                                      // Required
                widgetId: 599995,                                   // Optional
            }
        }]
    ];
```
