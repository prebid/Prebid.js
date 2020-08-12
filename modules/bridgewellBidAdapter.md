# Overview

Module Name: Bridgewell Bidder Adapter  
Module Type: Bidder Adapter  
Maintainer: scupio@bridgewell.com

# Description

Module that connects to Bridgewell demand source to fetch bids.

# Test Parameters
```
    var adUnits = [{
        code: 'test-div',
        mediaTypes: {
            banner: {
                sizes: [300, 250]
            }
        },
        bids: [{
            bidder: 'bridgewell',
            params: {
                ChannelID: 'CgUxMjMzOBIBNiIFcGVubnkqCQisAhD6ARoBOQ'
            }
        }]
    }, {
        code: 'test-div',
        mediaTypes: {
            banner: {
                sizes: [728, 90]
            }
        },
        bids: [{
            bidder: 'bridgewell',
            params: {
                ChannelID: 'CgUxMjMzOBIBNiIGcGVubnkzKggI2AUQWhoBOQ'
            }
        }]
    }, {
        code: 'test-div',
        sizes: [1, 1],
        mediaTypes: {
            native: {
                title: {
                    required: true,
                    len: 80
                },
                body: {
                    required: true
                },
                image: {
                    required: true,
                    sizes: [150, 50]
                },
                icon: {
                    required: false,
                    sizes: [50, 50]
                },
                clickUrl: {
                    required: true
                },
                cta: {
                    required: false
                },
                sponsoredBy: {
                    required: false
                }
            }
        },
        bids: [{
            bidder: 'bridgewell',
            params: {
                ChannelID: 'CgUxMjMzOBIBNiIGcGVubnkzKggI2AUQWhoBOQ'
            }
        }]
    }];
```
