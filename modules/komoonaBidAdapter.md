# Overview

**Module Name**: Komoona Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: support@komoona.com  

# Description

Connects to Komoona demand source to fetch bids.  

# Test Parameters
```
    var adUnits = [{
        code: 'banner-ad-div',
        sizes: [[300, 250]],

        // Replace this object to test a new Adapter!
        bids: [{
          bidder: 'komoona',
          params: {
            placementId: '1fee3606cd9b74644d9754b9dc9f6da5',
			hbid: '2ac5aea5692a4cfabaf77141c7d87676',
			floorPrice: 0.5
          }
        }]
    }];
```

