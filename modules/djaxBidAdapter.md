# Overview

```
Module Name: Djax Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@djaxtech.com
```

# Description

Module that connects to Djax

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
                   bidder: "djax",
                   params: {
                        publisherId: '2' // string - required
                    }
               }
           ]
        }
    ];
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                video: {
                   playerSize: [[480, 320]],  // a display size
                }
            },
            bids: [
               {
                   bidder: "djax",
                   params: {
                        publisherId: '12' // string - required
                    }
               }
           ]
        }
    ];