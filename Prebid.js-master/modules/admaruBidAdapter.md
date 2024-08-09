# Overview

```
Module Name: Admaru Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@admaru.com
```

# Description

Module that connects to Admaru demand sources

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
                   bidder: "admaru",
                   params: {
                        pub_id: '1234', // string - required
                        adspace_id: '1234' // string - required
                    }
               }
           ]
        }
    ];
```
