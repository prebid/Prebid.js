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
            placementId: 'e69148e0ba6c4c07977dc2daae5e1577',
			hbid: '1f5b2c10e66e419580bd943b9af692ab',
			floorPrice: 0.5
          }
        }]
    }];
```


