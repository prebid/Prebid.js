# Overview

```
Module Name: Adnuntius Bidder Adapter
Module Type: Bidder Adapter
Maintainer: info@adnuntius.com
```

# Description

Adnuntius Bidder Adapter for Prebid.js. 
Only Banner format is supported.

# Test Parameters
```
    var adUnits = [
            {
                code: "test-div",
                mediaTypes: {
                    banner: {
                        sizes: [[980, 360], [980, 300], [980, 240], [980, 120]]
                    }
                },
                bids: [
                    {
                        bidder: "adnuntius",
                        params: {
                            auId: "8b6bc",
                            network: "adnuntius",
                        }
                    },
                ]
            },
           
        ];
```
