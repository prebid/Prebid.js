# Overview

Module Name: Revcontent Adapater
Maintainer: dev@revcontent.com

# Description

Revcontent Adpater

# Test Parameters
```
    var adUnits = [{
        code: '/19968336/header-bid-tag-1',
        mediaTypes: {
            banner: {
                sizes: [
                    [300, 250]
                ]
            },
            // or native
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
                domain: 'test.com',                                 // Optional - Default referral hostname
                endpoint: 'trends.revcontent.com'                   // Optional/Debug - Set different endpoint
            }
        }]
    }];
```
