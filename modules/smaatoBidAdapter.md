# Overview

```
Module Name: Smaato Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@smaato.com
```

# Description

The Smaato adapter requires setup and approval from the Smaato team, even for existing Smaato publishers. Please reach out to your account team or prebid@smaato.com for more information.

# Test Parameters
```
var adUnits = [{
    "code": "header-bid-tag-1",
    "mediaTypes": {
        "banner": {
            "sizes": [320, 50]
        }
    },
    "bids": [{
        "bidder": "smaato",
        "params": {
            "publisherId": "1100012345",
            "adspaceId": "11002234"
        }
    }]
}];
```