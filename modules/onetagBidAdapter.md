# Overview

```
Module Name: OneTag Bid Adapter
Module Type: Bidder Adapter
Maintainer: devops@onetag.com
```

# Description

OneTag Bid Adapter supports only banner at present.

# Test Parameters
```
    var adUnits = [
        {
            code: "test-div",
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]]
                }
            },
            bids: [
                {
                    bidder: "onetag",
                    params: {
                        pubId: "your_publisher_id",         // required
                        type: "banner"                      // optional. Default "banner"
                    },
                }
            ]
    }];
    
```
