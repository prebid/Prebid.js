# Overview

Module Name: Revcontent Adapater
Maintainer: dev@revcontent.com

# Description

Revcontent Adpater

# Test Parameters
```
    var sizes = [
        [300, 250]
    ];
    var adUnits = [{
        code: '/19968336/header-bid-tag-1',
        sizes: sizes,
        mediaTypes: {
            banner: {
                sizes: sizes
            },
            // or native
            native: {
                native: {
                    image: {
                        required: false,
                        sizes: sizes[0]
                    },
                    title: {
                        required: false,
                        len: 140
                    },
                    clickUrl: {
                        required: false
                    }
                }
            }
        },
        bids: [{
            bidder: 'revcontent',
            params: {
                apiKey: '8a33sdfsdfdsfsdfssss544f8sdfsdfsdfd3b1c',  // Required
                userId: 69565,                                      // Required
                widgetId: 599995,                                   // Optional
                domain: 'test.com',                                 // Optional - Default referral hostname
                endpoint: 'trends.revcontent.com'                   // Optional/Debug - Set different endpoint
                sizes: sizes,                                       // Required - Do not modify
                                                                    // Required - Template required for display
                template: '<a href="{clickUrl}"><img src="{image.url}" width="{image.width}" height="{image.height}" /> <div style="position: absolute;top: 8px;left: 16px;"><h1>{title}</h1></div></a>',
            }
        }]
    }];
```
