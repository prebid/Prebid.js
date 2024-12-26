	
# Overview

```
Module Name: Paradocs Bidder Adapter
Module Type: Bidder Adapter

```

# Description

Module that connects to the Paradocs system
 
# Test Parameters

A test ad unit that will consistently return test creatives:

```

adUnits = [{
    code: 'paradocs-div-id',
    mediaTypes: {
        banner: {
            sizes: [[468, 60]]
        }
    },
    bids: [{
        bidder: 'paradocs',
        params: {
            placementId: 'ABC1234567890',
            requestUrl: 'https://header.bidder/endpoint/url',
            style: {
                title: {
                    family: "Tahoma",
                    size: "medium",
                    weight: "normal",
                    style: "normal",
                    color: "0053F9"
                },
                description: {
                    family: "Tahoma",
                    size: "medium",
                    weight: "normal",
                    style: "normal",
                    color: "000000"
                },
                url: {
                    family: "Tahoma",
                    size: "medium",
                    weight: "normal",
                    style: "normal",
                    color: "828282"
                },
                colors: {
                    background: "ffffff",
                    border: "E0E0E0",
                    link: "5B99FE"
                }
            },
            customParams: {
                cacheBuster: "",
                clickUrl: ""
            }
        }
    }]
}];
```
