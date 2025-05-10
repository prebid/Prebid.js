# Overview

**Module Name**: Lasso Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: headerbidding@lassomarketing.io

# Description

Connects to Lasso demand source to fetch bids.
Only banner format supported.

# Test Parameters

```
var adUnits = [{
   code: 'banner-ad-unit',
   mediaTypes: {
      banner: {
          sizes: [[300, 250]],
      }
   },
   bids: [{
     bidder: 'lasso',
     params: {
       adUnitId: '0'
     }
   }]
}];
```
