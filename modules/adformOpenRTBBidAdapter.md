# Overview

Module Name: Adform OpenRTB Adapter
Module Type: Bidder Adapter
Maintainer: Scope.FL.Scripts@adform.com

# Description

Module that connects to Adform demand sources to fetch bids.
Only native format is supported. Using OpenRTB standard.

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
            bidder: 'adformOpenRTB',
            params: {
                mid: 606169,                  // required
                adxDomain: 'adx.adform.net',  // optional
                siteId: '23455',              // optional
                priceType: 'gross'            // optional, default is 'net'
                publisher: {                  // optional block
                  id: "2706",
                  name: "Publishers Name",
                  domain: "publisher.com"
                }
            }
        }]
    ];
```
