# Overview

**Module Name**: Video Reach Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: hello@videoreach.com

# Description

Video Reach Bidder Adapter for Prebid.js.

Use `videoreach` as bidder.

`TagId` ist required.

## AdUnits configuration example
```
    var adUnits = [{
      code: 'your-slot', //use exactly the same code as your slot div id.
      sizes: [[1, 1]],
      bids: [{
          bidder: 'videoreach',
          params: { 
              TagId: 'XXXXX'
          }
      }]
    }];
```
