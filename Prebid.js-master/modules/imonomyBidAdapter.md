# Overview

**Module Name**: Imonomy Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: support@imonomy.com  

# Description

Connects to Imonomy demand source to fetch bids.  

# Test Parameters
```
    var adUnits = [{
        code: 'banner-ad-div',
        sizes: [[300, 250]],

        // Replace this object to test a new Adapter!
        bids: [{
          bidder: 'imonomy',
          params: {
            placementId: 'e69148e0ba6c4c07977dc2daae5e1577',
			hbid: '14567718624',
			floorPrice: 0.5
          }
        }]
    }];
```


