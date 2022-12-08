# Overview

```
Module Name: Smartadline Bidder Adapter
Module Type: Bidder Adapter
Maintainer: smartadline@gmail.com
```
# Description

Connect to Smartadline for bids.

The Smartadline adapter requires setup and approval from the Smartadline team.
Please reach out to your Technical account manager for more information.

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],  // a display size
                }
            },
            bids: [
                {
                    bidder: "smartadline",
                    params: {
                        publisherId: '12345'
                    }
                }
            ]
        },{
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[320, 50]],   // a mobile size
                }
            },
            bids: [
                {
                    bidder: "smartadline",
                    params: {
                        publisherId: 67890
                    }
                }
            ]
        }
    ];
```